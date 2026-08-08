import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../primitives/Dialog';
import { Button } from '../primitives/Button';
import { useToast } from '../Toast';
import {
  xUiMigrationApi,
  type XUiMigrateResponse,
  type XUiMigrationErrorCode,
  type XUiMigrationErrorDetail,
} from '../../api/xUiMigration';

interface RestoreXUiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (result: XUiMigrateResponse) => void;
  targetUserId?: number;
  targetUserLabel?: string;
}

const KNOWN_ERROR_CODES: XUiMigrationErrorCode[] = [
  'invalid_url',
  'not_found',
  'expired',
  'already_migrated',
  'tariff_missing',
];

function isKnownErrorCode(value: unknown): value is XUiMigrationErrorCode {
  return typeof value === 'string' && KNOWN_ERROR_CODES.includes(value as XUiMigrationErrorCode);
}

function extractErrorCode(error: unknown): XUiMigrationErrorCode | null {
  if (!(error instanceof AxiosError)) return null;
  const detail = error.response?.data?.detail;
  if (detail && typeof detail === 'object' && 'code' in detail) {
    const code = (detail as XUiMigrationErrorDetail).code;
    if (isKnownErrorCode(code)) return code;
  }
  // Fallback by HTTP status when detail format differs
  switch (error.response?.status) {
    case 400:
      return 'invalid_url';
    case 404:
      return 'not_found';
    case 409:
      return 'already_migrated';
    case 503:
      return 'tariff_missing';
    default:
      return null;
  }
}

export default function RestoreXUiDialog({
  open,
  onOpenChange,
  onSuccess,
  targetUserId,
  targetUserLabel,
}: RestoreXUiDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);

  const migrateMutation = useMutation({
    mutationFn: (value: string) =>
      targetUserId == null
        ? xUiMigrationApi.migrate(value)
        : xUiMigrationApi.migrateForUser(targetUserId, value),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['trial-info'] });
      if (targetUserId != null) {
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      }
      showToast({
        type: 'success',
        title: t('xUiMigration.successTitle', 'Подписка восстановлена'),
        message: t('xUiMigration.successMessage', {
          defaultValue: 'Тариф «{{tariff}}» · осталось {{days}} дн.',
          tariff: data.tariff_name,
          days: data.days_left,
        }),
        duration: 5000,
      });
      setLink('');
      setError(null);
      onOpenChange(false);
      onSuccess?.(data);
    },
    onError: (err) => {
      const code = extractErrorCode(err);
      if (code) {
        setError(t(`xUiMigration.errors.${code}`, DEFAULT_ERROR_MESSAGES[code]));
        return;
      }
      const fallback =
        err instanceof AxiosError && typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : t('common.error', 'Ошибка');
      setError(fallback);
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = link.trim();
    if (!trimmed) {
      setError(t('xUiMigration.errors.empty', 'Введите ссылку или UUID'));
      return;
    }
    setError(null);
    migrateMutation.mutate(trimmed);
  };

  const handleOpenChange = (next: boolean) => {
    if (migrateMutation.isPending) return;
    if (!next) {
      setLink('');
      setError(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!migrateMutation.isPending}>
        <DialogHeader className="pr-8">
          <DialogTitle>{t('xUiMigration.title', 'Восстановление старой подписки')}</DialogTitle>
          <DialogDescription>
            {targetUserId != null
              ? t('xUiMigration.adminDescription', {
                  defaultValue:
                    'Вставьте ссылку старой подписки. Подписка будет восстановлена пользователю {{user}}.',
                  user: targetUserLabel || `#${targetUserId}`,
                })
              : t(
                  'xUiMigration.description',
                  'Вставьте ссылку старой подписки, чтобы перенести подписку в новую систему.',
                )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-200">
              {t('xUiMigration.inputLabel', 'Ссылка или UUID')}
            </span>
            <textarea
              value={link}
              onChange={(event) => {
                setLink(event.target.value);
                if (error) setError(null);
              }}
              placeholder={t('xUiMigration.inputPlaceholder', 'vless://... или UUID клиента')}
              rows={3}
              autoFocus
              disabled={migrateMutation.isPending}
              className="w-full resize-none rounded-xl border border-dark-700/60 bg-dark-900/60 px-3 py-2.5 text-sm text-dark-100 placeholder:text-dark-500 focus:border-accent-500/50 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={migrateMutation.isPending}
              className="hidden sm:inline-flex"
            >
              {t('common.cancel', 'Отмена')}
            </Button>
            <Button type="submit" loading={migrateMutation.isPending}>
              {t('xUiMigration.submit', 'Восстановить')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const DEFAULT_ERROR_MESSAGES: Record<XUiMigrationErrorCode, string> = {
  invalid_url: 'Некорректная ссылка. Проверьте формат и попробуйте ещё раз.',
  not_found: 'Клиент с такой ссылкой не найден. Обратитесь в поддержку.',
  expired: 'Срок действия старой подписки уже истёк.',
  already_migrated: 'Эта подписка уже перенесена в новую систему.',
  tariff_missing: 'Подходящий тариф не настроен. Обратитесь в поддержку.',
};

import { cn } from '@/lib/utils';
import OAuthProviderIcon from './OAuthProviderIcon';

export function TelegramIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#2AABEE" />
      <path
        d="M17.5 7.18 15.6 17c-.14.7-.53.87-1.07.54l-2.96-2.18-1.43 1.38c-.16.16-.29.29-.6.29l.21-3.02 5.5-4.97c.24-.21-.05-.33-.37-.12l-6.8 4.28-2.93-.92c-.64-.2-.65-.64.13-.94l11.45-4.41c.53-.2.99.12.77.25Z"
        fill="white"
      />
    </svg>
  );
}

export function EmailIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}

export default function ProviderIcon({
  provider,
  className,
}: {
  provider: string;
  className?: string;
}) {
  switch (provider) {
    case 'telegram':
      return <TelegramIcon className={className ?? 'h-6 w-6'} />;
    case 'email':
      return <EmailIcon className={cn('text-dark-300', className ?? 'h-6 w-6')} />;
    default:
      return <OAuthProviderIcon provider={provider} className={className ?? 'h-6 w-6'} />;
  }
}

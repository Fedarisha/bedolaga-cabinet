import apiClient from './client';

export interface XUiMigrateResponse {
  success: boolean;
  tariff_id: number;
  tariff_name: string;
  subscription_id: number;
  apology_days: number;
  was_unlimited: boolean;
  days_left: number;
  expires_at: string | null;
}

export type XUiMigrationErrorCode =
  | 'invalid_url'
  | 'not_found'
  | 'expired'
  | 'already_migrated'
  | 'tariff_missing';

export interface XUiMigrationErrorDetail {
  code: XUiMigrationErrorCode;
  message: string;
}

export const xUiMigrationApi = {
  migrate: async (link: string): Promise<XUiMigrateResponse> => {
    const response = await apiClient.post<XUiMigrateResponse>('/cabinet/x-ui-migration/migrate', {
      link,
    });
    return response.data;
  },

  migrateForUser: async (userId: number, link: string): Promise<XUiMigrateResponse> => {
    const response = await apiClient.post<XUiMigrateResponse>(
      `/cabinet/admin/users/${userId}/x-ui-migration`,
      { link },
    );
    return response.data;
  },
};

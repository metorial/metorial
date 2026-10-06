import { buildApiServiceError, createAuthenticatedAxios } from 'slates';

export const createCursorAxios = (token: string) =>
  createAuthenticatedAxios({
    baseURL: 'https://api.cursor.com',
    timeout: 120_000,
    authHeader: { value: `Basic ${Buffer.from(`${token}:`).toString('base64')}` },
    errorAdapter: error =>
      buildApiServiceError(error, {
        parent: {},
        providerLabel: 'Cursor',
        reason: 'cursor_api_error'
      })
  });

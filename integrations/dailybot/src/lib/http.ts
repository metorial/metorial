import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export let createDailyBotAxios = (token: string) => {
  if (!token.trim()) {
    throw createApiServiceError(
      'A DailyBot API key is required. Reconnect with a valid key.',
      {
        reason: 'dailybot_missing_api_key'
      }
    );
  }

  return createAuthenticatedAxios({
    baseURL: 'https://api.dailybot.com/v1',
    authHeader: { name: 'X-API-KEY', value: token },
    timeout: 30_000,
    errorMapping: {
      mapAxiosError: error => {
        let data = error.response?.data;
        // The shared HTTP mapper reads message, but DailyBot reports detail.
        return isApiErrorRecord(data) && typeof data.detail === 'string' && data.detail.trim()
          ? { message: data.detail }
          : undefined;
      }
    },
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'DailyBot',
        reason: 'dailybot_api_error',
        extractUpstreamCode: error => {
          if (!isApiErrorRecord(error) || !isApiErrorRecord(error.data)) return undefined;
          let upstream = error.data.upstream;
          return isApiErrorRecord(upstream) && typeof upstream.code === 'string'
            ? upstream.code
            : undefined;
        }
      })
  });
};

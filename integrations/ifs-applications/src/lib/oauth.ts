import { createAxios, normalizeOAuthTokenResponse, requestAxiosData } from 'slates';
import { ifsApplicationsApiError, ifsApplicationsServiceError } from './errors';

type IfsOAuthTokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  token_type?: unknown;
  scope?: unknown;
};

export type IfsAccessToken = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  tokenType?: string;
  scope?: string;
};

export let normalizeAbsoluteUrl = (value: string, label: string) => {
  let trimmed = value.trim();

  if (!trimmed) {
    throw ifsApplicationsServiceError(`${label} is required.`, {
      reason: 'ifs_url_required'
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (error) {
    throw ifsApplicationsServiceError(`${label} must be a valid absolute URL.`, {
      reason: 'ifs_url_invalid',
      parent: error
    });
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw ifsApplicationsServiceError(`${label} must use http or https.`, {
      reason: 'ifs_url_invalid_protocol'
    });
  }

  return parsed.toString().replace(/\/+$/, '');
};

export let requestIfsAccessToken = async (input: {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  previousRefreshToken?: string;
}): Promise<IfsAccessToken> => {
  let http = createAxios();
  let body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: input.clientId,
    client_secret: input.clientSecret
  });

  let scope = input.scope?.trim();
  if (scope) {
    body.set('scope', scope);
  }

  let data = await requestAxiosData<IfsOAuthTokenResponse>(
    'OAuth client credentials token exchange',
    () =>
      http.post(input.tokenUrl, body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        }
      }),
    ifsApplicationsApiError
  );

  let normalized = normalizeOAuthTokenResponse(data, {
    providerLabel: 'IFS Cloud',
    operation: 'client credentials token exchange',
    previousRefreshToken: input.previousRefreshToken,
    refreshTokenFallbackMode: 'falsy'
  });

  let tokenType = typeof data.token_type === 'string' ? data.token_type : 'Bearer';
  let responseScope = typeof data.scope === 'string' ? data.scope : scope;

  if (tokenType.toLowerCase() !== 'bearer') {
    throw ifsApplicationsServiceError(
      `IFS OAuth token response returned unsupported token type "${tokenType}".`,
      { reason: 'ifs_oauth_token_type_unsupported' }
    );
  }

  return {
    token: normalized.token,
    refreshToken: normalized.refreshToken,
    expiresAt: normalized.expiresAt,
    tokenType,
    scope: responseScope
  };
};

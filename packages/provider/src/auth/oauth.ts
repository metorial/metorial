import { createApiServiceError } from '../error/api';

export type OAuthTokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  [key: string]: unknown;
};

export type OAuthRefreshTokenFallbackMode = 'nullish' | 'falsy';

export type OAuthExpiresAtOptions = {
  nowMs?: number;
  providerLabel?: string;
  operation?: string;
  required?: boolean;
  expiresInType?: 'number' | 'numberLike';
  message?: string;
};

export type NormalizeOAuthTokenResponseOptions = OAuthExpiresAtOptions & {
  previousRefreshToken?: string;
  refreshTokenFallbackMode?: OAuthRefreshTokenFallbackMode;
  accessTokenMessage?: string;
  expiresInMessage?: string;
};

let isOAuthTokenResponse = (value: unknown): value is OAuthTokenResponse =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let formatOAuthTokenResponseMessage = (
  fieldLabel: string,
  providerLabel = 'OAuth provider',
  operation = 'token response'
) => `${providerLabel} OAuth ${operation} did not return ${fieldLabel}.`;

export let getOAuthExpiresAtFromExpiresIn = (
  expiresIn: unknown,
  options: OAuthExpiresAtOptions = {}
) => {
  let {
    nowMs = Date.now(),
    providerLabel,
    operation,
    required = false,
    expiresInType = 'numberLike',
    message
  } = options;

  if (expiresIn === undefined || expiresIn === null || expiresIn === '') {
    if (required) {
      throw createApiServiceError(
        message ??
          formatOAuthTokenResponseMessage(
            'a valid expires_in value',
            providerLabel,
            operation
          ),
        { reason: 'oauth_token_response' }
      );
    }

    return undefined;
  }

  let seconds =
    typeof expiresIn === 'number'
      ? expiresIn
      : expiresInType === 'numberLike' && typeof expiresIn === 'string'
        ? Number(expiresIn)
        : Number.NaN;

  if (!Number.isFinite(seconds)) {
    throw createApiServiceError(
      message ??
        formatOAuthTokenResponseMessage('a valid expires_in value', providerLabel, operation),
      { reason: 'oauth_token_response' }
    );
  }

  return new Date(nowMs + seconds * 1000).toISOString();
};

let getRefreshToken = (
  refreshToken: unknown,
  previousRefreshToken: string | undefined,
  fallbackMode: OAuthRefreshTokenFallbackMode
) => {
  if (typeof refreshToken === 'string') {
    if (fallbackMode === 'falsy' && !refreshToken) {
      return previousRefreshToken;
    }

    return refreshToken;
  }

  if (fallbackMode === 'falsy' && !refreshToken) {
    return previousRefreshToken;
  }

  return refreshToken === undefined || refreshToken === null
    ? previousRefreshToken
    : undefined;
};

export let normalizeOAuthTokenResponse = (
  data: unknown,
  options: NormalizeOAuthTokenResponseOptions = {}
) => {
  let {
    providerLabel,
    operation,
    previousRefreshToken,
    refreshTokenFallbackMode = 'nullish',
    accessTokenMessage,
    expiresInMessage,
    ...expiresAtOptions
  } = options;

  if (!isOAuthTokenResponse(data)) {
    throw createApiServiceError(
      accessTokenMessage ??
        formatOAuthTokenResponseMessage('a token response object', providerLabel, operation),
      { reason: 'oauth_token_response' }
    );
  }

  if (typeof data.access_token !== 'string' || !data.access_token) {
    throw createApiServiceError(
      accessTokenMessage ??
        formatOAuthTokenResponseMessage('an access token', providerLabel, operation),
      { reason: 'oauth_token_response' }
    );
  }

  return {
    token: data.access_token,
    refreshToken: getRefreshToken(
      data.refresh_token,
      previousRefreshToken,
      refreshTokenFallbackMode
    ),
    expiresAt: getOAuthExpiresAtFromExpiresIn(data.expires_in, {
      ...expiresAtOptions,
      providerLabel,
      operation,
      message: expiresInMessage
    })
  };
};

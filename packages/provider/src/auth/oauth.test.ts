import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import type { ApiServiceError } from '../error/api';
import { getOAuthExpiresAtFromExpiresIn, normalizeOAuthTokenResponse } from './oauth';

describe('OAuth auth helpers', () => {
  it('converts expires_in seconds to an ISO expiresAt timestamp', () => {
    expect(getOAuthExpiresAtFromExpiresIn(60, { nowMs: 0 })).toBe('1970-01-01T00:01:00.000Z');
  });

  it('normalizes token responses and preserves omitted refresh tokens', () => {
    expect(
      normalizeOAuthTokenResponse(
        {
          access_token: 'access-token',
          expires_in: '120'
        },
        {
          nowMs: 0,
          previousRefreshToken: 'existing-refresh-token'
        }
      )
    ).toEqual({
      token: 'access-token',
      refreshToken: 'existing-refresh-token',
      expiresAt: '1970-01-01T00:02:00.000Z'
    });
  });

  it('supports falsy refresh-token fallback semantics', () => {
    expect(
      normalizeOAuthTokenResponse(
        {
          access_token: 'access-token',
          refresh_token: ''
        },
        {
          previousRefreshToken: 'existing-refresh-token',
          refreshTokenFallbackMode: 'falsy'
        }
      ).refreshToken
    ).toBe('existing-refresh-token');
  });

  it('throws ServiceError for missing access tokens', () => {
    let call = () =>
      normalizeOAuthTokenResponse(
        {
          expires_in: 120
        },
        {
          providerLabel: 'Example',
          operation: 'token exchange'
        }
      );

    expect(call).toThrow(ServiceError);

    try {
      call();
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceError);
      expect((error as ApiServiceError).data.reason).toBe('oauth_token_response');
    }
  });

  it('can require a numeric expires_in value', () => {
    expect(() =>
      normalizeOAuthTokenResponse(
        {
          access_token: 'access-token',
          expires_in: '120'
        },
        {
          providerLabel: 'Example',
          operation: 'token exchange',
          required: true,
          expiresInType: 'number'
        }
      )
    ).toThrow(ServiceError);
  });
});

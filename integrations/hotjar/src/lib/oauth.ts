import { createApiServiceError, createAxios, normalizeOAuthTokenResponse } from 'slates';
import { hotjarApiError } from './errors';

export type HotjarToken = {
  accessToken: string;
  expiresAt: string;
};

export let requestHotjarAccessToken = async (
  clientId: string,
  clientSecret: string
): Promise<HotjarToken> => {
  try {
    let http = createAxios({
      baseURL: 'https://api.hotjar.io'
    });

    let params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    let response = await http.post('/v1/oauth/token', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    let token = normalizeOAuthTokenResponse(response.data, {
      providerLabel: 'Hotjar',
      operation: 'token exchange',
      required: true,
      expiresInType: 'number',
      accessTokenMessage:
        'Hotjar OAuth token response did not include access_token and expires_in.',
      expiresInMessage:
        'Hotjar OAuth token response did not include access_token and expires_in.'
    });

    if (!token.expiresAt) {
      throw createApiServiceError(
        'Hotjar OAuth token response did not include access_token and expires_in.'
      );
    }

    return {
      accessToken: token.token,
      expiresAt: token.expiresAt
    };
  } catch (error) {
    throw hotjarApiError(error, 'OAuth token exchange');
  }
};

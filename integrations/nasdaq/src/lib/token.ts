import { createApiServiceError, normalizeOAuthTokenResponse } from 'slates';
import { z } from 'zod';
import { createNasdaqHttp, parseResponse, validateHttpsUrl } from './http';

export let requestAccessToken = async (input: {
  clientId: string;
  clientSecret: string;
  tokenEndpoint: string;
}) => {
  if (!input.clientId.trim() || !input.clientSecret.trim()) {
    throw createApiServiceError('Nasdaq client ID and client secret are required.');
  }
  let tokenEndpoint = validateHttpsUrl(input.tokenEndpoint, 'Token endpoint');
  let response = await createNasdaqHttp().post(
    tokenEndpoint,
    {
      client_id: input.clientId,
      client_secret: input.clientSecret
    },
    { headers: { 'Content-Type': 'application/json' } }
  );
  let data = parseResponse(
    z.object({
      access_token: z.string().min(1),
      expires_in: z.number().positive().finite()
    }),
    response.data,
    'authentication'
  );
  let nowMs = Date.now();
  if (!Number.isFinite(new Date(nowMs + data.expires_in * 1000).getTime())) {
    throw createApiServiceError('Nasdaq returned an invalid access-token expiry.');
  }
  let token = normalizeOAuthTokenResponse(data, {
    nowMs,
    providerLabel: 'Nasdaq',
    required: true,
    expiresInType: 'number'
  });
  return { token: token.token, expiresAt: token.expiresAt! };
};

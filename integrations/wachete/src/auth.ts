import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getOAuthExpiresAtFromExpiresIn,
  requestAxiosData,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://api.wachete.com/thirdparty/v1',
  timeout: 30000
});

let login = async (input: { userId: string; apiKey: string }) => {
  if (!input.userId.trim() || !input.apiKey.trim()) {
    throw createApiServiceError('Provide your Wachete User ID and API key from your profile.');
  }

  let response = await requestAxiosData<{ token?: unknown; expiresInSec?: unknown }>(
    'sign in',
    () => http.post('/user/apilogin', input),
    (error, operation) =>
      buildApiServiceError(error, {
        providerLabel: 'Wachete',
        reason: 'wachete_auth_error',
        operation
      })
  );

  if (!response || typeof response.token !== 'string' || !response.token.trim()) {
    throw createApiServiceError('Wachete did not return a valid access token.');
  }

  if (
    response.expiresInSec != null &&
    (typeof response.expiresInSec !== 'number' ||
      !Number.isFinite(response.expiresInSec) ||
      response.expiresInSec <= 0)
  ) {
    throw createApiServiceError('Wachete returned an invalid access token lifetime.');
  }

  return {
    token: response.token,
    expiresAt: getOAuthExpiresAtFromExpiresIn(response.expiresInSec, {
      expiresInType: 'number',
      message: 'Wachete returned an invalid access token lifetime.'
    })
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      expiresAt: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      userId: z.string().describe('Your Wachete User ID, found in your profile settings'),
      apiKey: z.string().describe('Your Wachete API key, found in your profile settings')
    }),

    getOutput: async ctx => ({ output: await login(ctx.input) }),
    handleTokenRefresh: async (ctx: { input: { userId: string; apiKey: string } }) => ({
      output: await login(ctx.input)
    })
  });

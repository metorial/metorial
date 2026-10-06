import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export const v4AuthRemediation =
  'The retained API v4 auth option is unavailable for these supported API v3 tools. Reconnect using a Flutterwave API v3 Secret Key. API v4 uses a separate client-credentials grant and different endpoints; no token is exchanged or redirected here.';
export const validateSecretKey = (token: string) => {
  if (!/^FLWSECK(?:_TEST)?-[A-Za-z0-9_-]+$/.test(token))
    throw createApiServiceError(
      'A valid API v3 Secret Key is required. API v4 access tokens cannot authenticate these tools.'
    );
  return token;
};
const unavailableV4 = async (): Promise<never> => {
  throw createApiServiceError(v4AuthRemediation);
};
export let auth = SlateAuth.create()
  .output(z.object({ token: z.string().describe('Flutterwave API v3 Secret Key') }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'Secret Key (API v3)',
    key: 'secret_key',
    inputSchema: z.object({
      secretKey: z
        .string()
        .describe(
          'API v3 Secret Key: FLWSECK_TEST- for test mode, FLWSECK- for live mode. Configure the matching environment before using tools.'
        )
    }),
    getOutput: async ctx => ({ output: { token: validateSecretKey(ctx.input.secretKey) } })
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'Deprecated API v4 OAuth — use API v3 Secret Key',
    key: 'oauth_v4',
    scopes: [],
    getAuthorizationUrl: unavailableV4,
    handleCallback: unavailableV4,
    handleTokenRefresh: unavailableV4
  });

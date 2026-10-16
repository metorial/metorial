import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let exchangeIamToken = async (oauthToken: string) => {
  if (!oauthToken.trim()) {
    throw createApiServiceError(
      'A Yandex ID OAuth token is required. Reconnect with a valid token.'
    );
  }
  let client = createAuthenticatedAxios({
    baseURL: 'https://iam.api.cloud.yandex.net',
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'Yandex Cloud',
        reason: 'yandex_auth_failed',
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
      })
  });
  let response = await client.post('/iam/v1/tokens', {
    yandexPassportOauthToken: oauthToken
  });
  let result = z
    .object({ iamToken: z.string().min(1), expiresAt: z.string().min(1) })
    .safeParse(response.data);
  if (!result.success || !Number.isFinite(Date.parse(result.data.expiresAt))) {
    throw createApiServiceError(
      'Yandex Cloud did not return a valid IAM token and expiration time. Reconnect and try again.'
    );
  }
  return {
    token: result.data.iamToken,
    authType: 'iam_token' as const,
    expiresAt: result.data.expiresAt
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('IAM token or API key used for authorization'),
      authType: z.enum(['iam_token', 'api_key']).describe('Type of authentication being used'),
      expiresAt: z.string().optional().describe('Provider-issued IAM token expiration time')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'IAM Token (OAuth)',
    key: 'iam_token_oauth',

    inputSchema: z.object({
      oauthToken: z.string().describe('OAuth token from Yandex ID used to obtain an IAM token')
    }),

    getOutput: async ctx => {
      return { output: await exchangeIamToken(ctx.input.oauthToken) };
    },
    handleTokenRefresh: async (ctx: {
      input: { oauthToken: string };
      output: { token: string; authType: 'iam_token' | 'api_key'; expiresAt?: string };
    }) => ({
      output: { ...ctx.output, ...(await exchangeIamToken(ctx.input.oauthToken)) }
    })
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Yandex Cloud service-account API key. Supported services and allowed operations depend on its scopes and validity period; use IAM authentication for infrastructure management.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authType: 'api_key' as const
        }
      };
    }
  });

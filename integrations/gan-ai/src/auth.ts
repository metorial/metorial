import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let studioAxios = createAuthenticatedAxios({
  baseURL: 'https://api.gan.ai',
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'Gan.AI Studio',
      reason: 'gan_ai_auth_error',
      operation: 'login'
    })
});

let studioTokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().optional()
});

let loginStudio = async (
  input: { email: string; password: string },
  previousRefreshToken?: string
) => {
  let response = await studioAxios.post('/users/login', {
    email: input.email,
    password: input.password
  });
  let tokens = studioTokenSchema.safeParse(response.data);
  if (!tokens.success) {
    throw createApiServiceError(
      'Gan.AI Studio login did not return a valid access token. Reconnect the account and try again.'
    );
  }
  return {
    token: tokens.data.access_token,
    refreshToken: tokens.data.refresh_token ?? previousRefreshToken,
    authType: 'studio' as const
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      authType: z.enum(['playground', 'studio'])
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Playground API Key',
    key: 'playground_api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('API key from playground.gan.ai')
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Provide a Playground API key to connect the account.');
      }
      return {
        output: {
          token: ctx.input.apiKey,
          authType: 'playground' as const
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Studio Login',
    key: 'studio_login',

    inputSchema: z.object({
      email: z.string().describe('Email address for Gan.AI Studio'),
      password: z.string().describe('Password for Gan.AI Studio')
    }),

    getOutput: async ctx => {
      return {
        output: await loginStudio(ctx.input)
      };
    },

    handleTokenRefresh: async (ctx: {
      input: { email: string; password: string };
      output: { token: string; refreshToken?: string; authType: 'playground' | 'studio' };
    }) => {
      return {
        output: await loginStudio(ctx.input, ctx.output.refreshToken)
      };
    }
  });

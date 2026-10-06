import { SlateAuth } from 'slates';
import { z } from 'zod';

type AuthOutput = { token?: string };
type ApiKeyInput = { apiKey: string };
type OidcInput = { accessToken: string };

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().min(1).describe('Weaviate API key for authentication')
    }),
    getOutput: async (ctx: { input: ApiKeyInput }) => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (_ctx: { output: AuthOutput; input: ApiKeyInput }) => {
      return {
        profile: {
          name: 'API Key User'
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'OIDC Bearer Token',
    key: 'oidc_bearer',
    inputSchema: z.object({
      accessToken: z
        .string()
        .min(1)
        .describe(
          'OIDC access token for authentication. Reconnect with a new token when it expires; automatic refresh is not configured.'
        )
    }),
    getOutput: async (ctx: { input: OidcInput }) => {
      return {
        output: {
          token: ctx.input.accessToken
        }
      };
    }
  })
  .addNone();

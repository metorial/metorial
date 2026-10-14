import { createApiServiceError, isApiErrorRecord, SlateAuth } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Your Unisender API key. Found under API section of your account settings.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = new UnisenderClient({ token: ctx.output.token });
      let result = await client.getUserInfo();
      if (!isApiErrorRecord(result) || typeof result.login !== 'string' || !result.login) {
        throw createApiServiceError(
          'Unisender did not return an account login for this API key.'
        );
      }

      return {
        profile: {
          id: result.login,
          email: typeof result.email === 'string' ? result.email : undefined,
          name: result.login
        }
      };
    }
  });

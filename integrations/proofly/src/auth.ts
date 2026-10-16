import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { prooflyString } from './lib/response';

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
      apiKey: z
        .string()
        .describe('Your Proofly API key, found on the Proofly developers page.')
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Provide a Proofly API key, then reconnect.', {
          reason: 'proofly_missing_api_key'
        });
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let user = await new Client({ token: ctx.output.token }).getUser();
      let name = prooflyString(user.name);
      let email = prooflyString(user.email);
      if (!name && !email) {
        throw createApiServiceError('Proofly did not return an account name or email.', {
          reason: 'proofly_invalid_profile'
        });
      }

      return {
        profile: {
          name,
          email
        }
      };
    }
  });

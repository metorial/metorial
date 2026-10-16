import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { ProcFuClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'ProcFu API Auth Token from Security & Keys. Allow the calling server IP there before connecting.'
        )
    }),

    getOutput: async ctx => {
      let token = ctx.input.token.trim();
      if (!token) {
        throw createApiServiceError('A ProcFu API Auth Token is required.');
      }
      return {
        output: {
          token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = new ProcFuClient({ token: ctx.output.token });
      let email = await client.whoami();

      return {
        profile: {
          email,
          name: email
        }
      };
    }
  });

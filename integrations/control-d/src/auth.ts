import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

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
        .describe('Control D API token generated from the dashboard under the API section')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let user = await new Client({ token: ctx.output.token }).getUser();
      if (!user?.PK || !user.email) {
        throw createApiServiceError(
          'Control D returned incomplete account information; verify the API token'
        );
      }

      return {
        profile: {
          id: user.PK,
          email: user.email
        }
      };
    }
  });

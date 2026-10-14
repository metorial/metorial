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
        .describe(
          'Rentman API token. Generate at Configuration > Account > Integrations in Rentman.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = new Client({ token: ctx.output.token });
      let response = await client.get('crew', 'current');
      let user = response.data;
      if (!user || user.id === undefined || user.id === null) {
        throw createApiServiceError('Rentman did not return a crew profile for this token.', {
          reason: 'rentman_invalid_profile'
        });
      }

      return {
        profile: {
          id: user?.id?.toString(),
          name:
            [user.firstname, user.lastname ?? user.surname].filter(Boolean).join(' ') ||
            undefined,
          email: user?.email || undefined
        }
      };
    }
  });

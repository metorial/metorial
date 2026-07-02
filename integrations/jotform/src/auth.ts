import { SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { Client } from './lib/client';
import { jotformServiceError } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('JotForm API key')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z.string().describe('Your JotForm API key. Generate one at Settings > API.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = new Client({
        token: ctx.output.token,
        apiDomain: 'https://api.jotform.com'
      });

      let user = await client.getUser();

      if (!user?.username) {
        throw jotformServiceError('Jotform profile response did not include a username.');
      }

      return {
        profile: {
          id: user.username,
          email: user.email,
          name: user.name
        }
      };
    }
  });

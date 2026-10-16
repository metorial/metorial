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
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Daffy API key. Obtain from https://www.daffy.org/settings/api')
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('Enter a Daffy API key from your account settings.');
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = new Client({ token: ctx.output.token });
      let user = await client.getMe();

      return {
        profile: {
          id: String(user.id),
          name: user.name,
          imageUrl: user.avatar
        }
      };
    }
  });

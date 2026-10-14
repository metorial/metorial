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
        .describe('Postman API key (generated from your Postman account settings)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let data = await new Client({ token: ctx.output.token }).getAuthenticatedUser();
      let user = data.user;
      if (!user?.id)
        throw createApiServiceError('Postman did not return an authenticated user profile.');

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: user.fullName,
          imageUrl: user.avatar,
          username: user.username
        }
      };
    }
  });

import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { PilvioClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string().describe('Pilvio API token') }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z.string().describe('Pilvio API token. Generate one at https://app.pilvio.com/')
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('A Pilvio API token is required.');
      return { output: { token: ctx.input.token } };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let user = await new PilvioClient({ token: ctx.output.token }).getUser();
      let id = user.cookie_id ?? user.id;
      if ((typeof id !== 'string' && typeof id !== 'number') || id === '') {
        throw createApiServiceError('Pilvio did not return an authenticated user ID.');
      }
      let profile = user.profile_data;
      return {
        profile: {
          id: String(id),
          email: profile?.email ?? user.email,
          name:
            [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
            user.name ||
            undefined
        }
      };
    }
  });

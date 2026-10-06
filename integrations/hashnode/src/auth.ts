import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { token } from './lib/schemas';
export const auth = SlateAuth.create()
  .output(z.object({ token }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'pat',
    inputSchema: z.object({
      token: token.describe(
        'Personal access token from Account Settings → Developer / API tokens. Pro entitlement and role restrictions apply separately to publication operations.'
      )
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.token.replace(/^Bearer /i, '') } }),
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      const user = await new Client({ token: ctx.output.token }).getMe();
      return {
        profile: {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? user.username,
          imageUrl: user.profilePicture ?? undefined
        }
      };
    }
  });

import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { AdminClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Botpress Personal Access Token (PAT)')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'pat',
    inputSchema: z.object({
      token: z.string().describe('Personal Access Token from Botpress Profile Settings')
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('A Botpress Personal Access Token is required.');
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let { account } = await new AdminClient({ token: ctx.output.token }).getAccount();
      if (!account?.id)
        throw createApiServiceError('Botpress did not return the authenticated account.');
      return {
        profile: {
          id: account?.id,
          email: account?.email,
          name: account?.displayName
        }
      };
    }
  });

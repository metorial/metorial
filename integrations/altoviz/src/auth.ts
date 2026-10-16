import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Your Altoviz API key from account Settings > API access.')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim())
        throw createApiServiceError('An Altoviz API key is required.');
      return { output: { token: ctx.input.apiKey } };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      let user = await new Client({ token: ctx.output.token }).getCurrentUser();
      if (typeof user.userId !== 'string' || !user.userId.trim()) {
        throw createApiServiceError('Altoviz returned a current user without a valid userId.');
      }
      return {
        profile: {
          id: user.userId,
          email: typeof user.email === 'string' ? user.email : undefined,
          name:
            typeof user.displayName === 'string'
              ? user.displayName
              : [user.firstName, user.lastName]
                  .filter(value => typeof value === 'string')
                  .join(' ') || undefined
        }
      };
    }
  });

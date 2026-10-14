import { createApiServiceError, isApiErrorRecord, SlateAuth } from 'slates';
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
      apiToken: z
        .string()
        .describe('Your Hyperise API token. Generate it from your Hyperise account Settings.')
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiToken.trim()) {
        throw createApiServiceError('Enter your Hyperise API token from Settings > API.');
      }
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiToken: string } }) => {
      let result = await new Client({ token: ctx.output.token }).getCurrentUser();
      let user = result?.data ?? result;
      if (!isApiErrorRecord(user)) {
        throw createApiServiceError('Hyperise returned an invalid account profile.');
      }

      let fullName = [user.first_name, user.last_name]
        .filter(value => typeof value === 'string' && value)
        .join(' ')
        .trim();

      return {
        profile: {
          id:
            typeof user.id === 'string' || typeof user.id === 'number'
              ? String(user.id)
              : undefined,
          email: typeof user.email === 'string' ? user.email : undefined,
          name: typeof user.name === 'string' && user.name ? user.name : fullName || undefined
        }
      };
    }
  });

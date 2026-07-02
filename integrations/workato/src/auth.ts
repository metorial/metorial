import { axios, SlateAuth } from 'slates';
import { z } from 'zod';
import { getApiBaseUrl } from './lib/urls';

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
          'Workato API client token (Bearer token). Create one under Workspace admin > API clients.'
        ),
      dataCenter: z
        .enum(['us', 'eu', 'jp', 'sg', 'au'])
        .default('us')
        .describe('Data center region of your Workato workspace')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string };
      input: { token: string; dataCenter: string };
    }) => {
      let baseUrl = getApiBaseUrl(ctx.input.dataCenter ?? 'us');
      let response = await axios.get(`${baseUrl}/users/me`, {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });
      let user = response.data;
      return {
        profile: {
          id: String(user.id),
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          imageUrl: user.avatar_url ?? undefined
        }
      };
    }
  });

import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Access Token',
    key: 'api_access_token',

    inputSchema: z.object({
      token: z.string().describe('LaunchDarkly API access token (personal or service token)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://app.launchdarkly.com/api/v2',
        headers: {
          Authorization: ctx.output.token
        }
      });

      try {
        let response = await http.get('/caller');
        let caller = response.data;

        return {
          profile: {
            id: caller._id ?? caller.accountId,
            email: caller.email,
            name: caller.firstName
              ? `${caller.firstName} ${caller.lastName ?? ''}`.trim()
              : caller.name
          }
        };
      } catch {
        return {
          profile: {}
        };
      }
    }
  });

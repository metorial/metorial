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
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'OpsGenie API key (API integration key or account-level API key). Select the matching US or EU instance in the configuration.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      // Auth callbacks run without the region config, and US keys are rejected by the EU API
      // (and vice versa), so try both instances before giving up on a profile.
      for (let baseURL of ['https://api.opsgenie.com', 'https://api.eu.opsgenie.com']) {
        let http = createAxios({
          baseURL,
          headers: {
            Authorization: `GenieKey ${ctx.output.token}`
          }
        });

        try {
          let response = await http.get('/v2/account');
          let account = response.data?.data ?? {};
          return {
            profile: {
              id: account.id ?? account.name ?? undefined,
              name: account.name ?? undefined
            }
          };
        } catch {
          // Try the next instance; account info also requires configuration access.
        }
      }

      return {
        profile: {}
      };
    }
  });

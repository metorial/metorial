import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Leadfeeder API token for the main API'),
      ipEnrichToken: z
        .string()
        .optional()
        .describe('IP-Enrich API key for the lf-discover API')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .describe('Leadfeeder API token (found in Personal settings > API tokens)'),
      ipEnrichApiKey: z
        .string()
        .optional()
        .describe(
          'IP-Enrich API key (separate from the main API token, required for IP enrichment)'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken,
          ipEnrichToken: ctx.input.ipEnrichApiKey
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; ipEnrichToken?: string };
      input: { apiToken: string; ipEnrichApiKey?: string };
    }) => {
      let http = createAxios({
        baseURL: 'https://api.leadfeeder.com',
        headers: {
          Authorization: `Token token=${ctx.output.token}`
        }
      });

      let response = await http.get('/accounts');
      let accounts = response.data?.data;
      let firstAccount = accounts?.[0];

      return {
        profile: {
          id: firstAccount?.id,
          name: firstAccount?.attributes?.name
        }
      };
    }
  });

import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('New Relic User API Key for NerdGraph and REST API access'),
      licenseKey: z
        .string()
        .optional()
        .describe('New Relic License Key for data ingest APIs (Metric, Event, Log, Trace)')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'User API Key',
    key: 'user_api_key',
    inputSchema: z.object({
      userApiKey: z
        .string()
        .describe(
          'New Relic User API Key (also called Personal API Key). Required for querying data and managing resources.'
        ),
      licenseKey: z
        .string()
        .optional()
        .describe(
          'New Relic License Key (Ingest Key). Required only if you need to ingest metrics, events, logs, or traces.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.userApiKey,
          licenseKey: ctx.input.licenseKey
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; licenseKey?: string };
      input: { userApiKey: string; licenseKey?: string };
    }) => {
      let http = createAxios({
        baseURL: 'https://api.newrelic.com',
        headers: {
          'API-Key': ctx.output.token,
          'Content-Type': 'application/json'
        }
      });

      let response = await http.post('/graphql', {
        query: `{ actor { user { email name id } } }`
      });

      let user = response.data?.data?.actor?.user;

      return {
        profile: {
          id: user?.id?.toString(),
          email: user?.email,
          name: user?.name
        }
      };
    }
  });

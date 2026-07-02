import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('App API key for accessing the App API (bearer token)'),
      siteId: z.string().describe('Site ID for Track API authentication'),
      trackApiKey: z.string().describe('Track API key for Track API authentication')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Credentials',
    key: 'api_credentials',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'App API Key (Bearer token) — found under Account Settings > API Credentials. Used to trigger messages, manage broadcasts, and fetch workspace data.'
        ),
      siteId: z
        .string()
        .describe(
          'Site ID — found under Account Settings > API Credentials. Used as the username for Track API basic authentication.'
        ),
      trackApiKey: z
        .string()
        .describe(
          'Track API Key — found under Account Settings > API Credentials. Used as the password for Track API basic authentication.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          siteId: ctx.input.siteId,
          trackApiKey: ctx.input.trackApiKey
        }
      };
    }
  });

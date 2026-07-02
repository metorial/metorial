import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiType: z.enum(['cloud', 'subscription', 'local']),
      apiSecret: z.string().optional(),
      baseUrl: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Cloud API Token',
    key: 'cloud_api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'API token created in the Vestaboard mobile app Settings or Developer web app. Passed via X-Vestaboard-Token header.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          apiType: 'cloud' as const
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Subscription API Credentials',
    key: 'subscription_api',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'API key for the Subscription API, created from the Developer section of the web app.'
        ),
      apiSecret: z
        .string()
        .describe(
          'API secret for the Subscription API, created from the Developer section of the web app.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          apiType: 'subscription' as const,
          apiSecret: ctx.input.apiSecret
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Local API Key',
    key: 'local_api',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Local API key obtained from the one-time enablement process.'),
      baseUrl: z
        .string()
        .describe(
          'Base URL of your Vestaboard on the local network (e.g. http://vestaboard.local:7000 or an IP address with port).'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          apiType: 'local' as const,
          baseUrl: ctx.input.baseUrl
        }
      };
    }
  });

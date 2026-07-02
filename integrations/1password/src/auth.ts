import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authType: z.enum(['connect', 'service_account', 'events_api'])
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Connect Server Token',
    key: 'connect_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'The 1Password Connect server access token. Created when setting up a Connect server.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authType: 'connect' as const
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Service Account Token',
    key: 'service_account_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'The 1Password service account token (starts with "ops_"). Created via 1Password.com or CLI.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authType: 'service_account' as const
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Events API Token',
    key: 'events_api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'The 1Password Events API bearer token. Created under Integrations > Events Reporting in 1Password.com. Requires a 1Password Business account.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authType: 'events_api' as const
        }
      };
    }
  });

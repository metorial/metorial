import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe(
          'Bearer token for the private/management API (obtained from minerstat dashboard)'
        ),
      accessKey: z
        .string()
        .describe(
          'Access key for the public/monitoring API (obtained from minerstat dashboard)'
        ),
      developerApiKey: z
        .string()
        .optional()
        .describe(
          'Developer API key for Coins, Hardware, and Pools APIs (obtained from the Developer Portal)'
        )
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Credentials',
    key: 'api_credentials',
    inputSchema: z.object({
      bearerToken: z
        .string()
        .describe('Bearer token from the minerstat dashboard API page for worker management'),
      accessKey: z
        .string()
        .describe('Access key from the minerstat dashboard for worker monitoring'),
      developerApiKey: z
        .string()
        .optional()
        .describe(
          'Developer API key from the minerstat Developer Portal for coins, hardware, and pools data'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.bearerToken,
          accessKey: ctx.input.accessKey,
          developerApiKey: ctx.input.developerApiKey
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Monitoring Only',
    key: 'monitoring_only',
    inputSchema: z.object({
      accessKey: z
        .string()
        .describe('Access key from the minerstat dashboard for worker monitoring'),
      developerApiKey: z
        .string()
        .optional()
        .describe(
          'Developer API key from the minerstat Developer Portal for coins, hardware, and pools data'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: '',
          accessKey: ctx.input.accessKey,
          developerApiKey: ctx.input.developerApiKey
        }
      };
    }
  });

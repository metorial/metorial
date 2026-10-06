import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      apiId: z.string(),
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiId: z
        .string()
        .describe(
          'Your Splunk On-Call API ID (X-VO-Api-Id). Found under Integrations >> API in your Splunk On-Call account.'
        ),
      apiKey: z
        .string()
        .describe(
          'Your Splunk On-Call API Key (X-VO-Api-Key). Only admin users can create API keys.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          apiId: ctx.input.apiId,
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: {
      output: { apiId: string; token: string };
      input: { apiId: string; apiKey: string };
    }) => {
      await new Client(ctx.output).listUsers();
      return { profile: { name: 'Splunk On-Call organization' } };
    }
  });

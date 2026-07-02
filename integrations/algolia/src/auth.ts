import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      applicationId: z.string().describe('Algolia Application ID'),
      token: z.string().describe('Algolia API Key')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      applicationId: z
        .string()
        .describe('Your Algolia Application ID. Found in the Algolia dashboard.'),
      apiKey: z
        .string()
        .describe(
          'Your Algolia API Key (Admin, Search-only, or custom key with appropriate ACL permissions).'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          applicationId: ctx.input.applicationId,
          token: ctx.input.apiKey
        }
      };
    }
  });

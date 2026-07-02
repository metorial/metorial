import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      siteId: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & Site ID',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'API Key (Site Key) from WaiverFile dashboard Settings >> API >> API Keys tab'
        ),
      siteId: z
        .string()
        .describe('Site ID from WaiverFile dashboard Settings >> API >> API Keys tab')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          siteId: ctx.input.siteId
        }
      };
    }
  });

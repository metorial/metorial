import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Base64-encoded identifier:key for Basic Auth'),
      tier: z
        .enum(['plugin', 'website', 'user'])
        .optional()
        .describe('Crisp REST API token tier used for the X-Crisp-Tier header')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Crisp API Token',
    key: 'plugin_token',

    inputSchema: z.object({
      identifier: z.string().describe('Crisp API token identifier'),
      key: z.string().describe('Crisp API token key'),
      tier: z
        .enum(['plugin', 'website', 'user'])
        .optional()
        .default('plugin')
        .describe('Crisp token tier to send as X-Crisp-Tier')
    }),

    getOutput: async ctx => {
      let encoded = btoa(`${ctx.input.identifier}:${ctx.input.key}`);
      return {
        output: {
          token: encoded,
          tier: ctx.input.tier
        }
      };
    }
  });

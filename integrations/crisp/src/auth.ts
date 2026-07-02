import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Base64-encoded identifier:key for Basic Auth')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Plugin Token',
    key: 'plugin_token',

    inputSchema: z.object({
      identifier: z.string().describe('Plugin token identifier from the Crisp Marketplace'),
      key: z.string().describe('Plugin token key from the Crisp Marketplace')
    }),

    getOutput: async ctx => {
      let encoded = btoa(`${ctx.input.identifier}:${ctx.input.key}`);
      return {
        output: {
          token: encoded
        }
      };
    }
  });

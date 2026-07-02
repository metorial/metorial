import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      consumerKey: z.string(),
      consumerSecret: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Keys',
    key: 'api_keys',

    inputSchema: z.object({
      consumerKey: z.string().describe('WooCommerce REST API Consumer Key'),
      consumerSecret: z.string().describe('WooCommerce REST API Consumer Secret')
    }),

    getOutput: async ctx => {
      return {
        output: {
          consumerKey: ctx.input.consumerKey,
          consumerSecret: ctx.input.consumerSecret
        }
      };
    }
  });

import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('PageXCRM API key for account identification'),
      rapidApiToken: z.string().describe('RapidAPI key for accessing the PageXCRM API')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Keys',
    key: 'api_keys',

    inputSchema: z.object({
      pageXApiKey: z
        .string()
        .describe('Your PageXCRM API key obtained from your PageXCRM account'),
      rapidApiKey: z
        .string()
        .describe('Your RapidAPI key obtained by subscribing to the PageXCRM API on RapidAPI')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.pageXApiKey,
          rapidApiToken: ctx.input.rapidApiKey
        }
      };
    }
  });

import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      appId: z.string().describe('Heap App ID (Environment ID) used for API authentication'),
      token: z
        .string()
        .describe('Heap API Key used for generating auth tokens for deletion operations')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'App ID & API Key',
    key: 'app_id_api_key',

    inputSchema: z.object({
      appId: z
        .string()
        .describe(
          'Your Heap App ID (Environment ID). Found under Administration > Account > Manage > Privacy & Security > Use the API tab.'
        ),
      apiKey: z
        .string()
        .describe('Your Heap API Key. Found in the same location as the App ID.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          appId: ctx.input.appId,
          token: ctx.input.apiKey
        }
      };
    }
  });

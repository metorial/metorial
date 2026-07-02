import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      clientId: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & Client ID',
    key: 'api_key_client_id',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'API Key from the Heyzine developer settings page. Used for flipbook management, bookshelf, social metadata, and password protection endpoints.'
        ),
      clientId: z
        .string()
        .describe(
          'Client ID from the Heyzine developer settings page. Used for flipbook conversion endpoints.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          clientId: ctx.input.clientId
        }
      };
    }
  });

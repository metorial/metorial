import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your Updown.io API key, found on the settings page at https://updown.io/settings/edit'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Read-Only API Key',
    key: 'readonly_api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your Updown.io read-only API key, found on the settings page. Only works with GET endpoints.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });

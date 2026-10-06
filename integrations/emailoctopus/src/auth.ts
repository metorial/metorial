import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

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
      token: z
        .string()
        .describe(
          'Current EmailOctopus API v2 key from Integrations & APIs. Keys labelled legacy cannot authenticate this API.'
        )
    }),

    getOutput: async ctx => {
      await new Client({ token: ctx.input.token }).getLists(undefined, 1);
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });

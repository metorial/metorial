import { createHash } from 'node:crypto';
import { SlateAuth } from 'slates';
import { z } from 'zod';
import { ShortPixelClient } from './lib/client';
import { readOptionalNumber } from './lib/responses';

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
        .describe('Your ShortPixel API Key (20 characters, letters and numbers)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let data = await new ShortPixelClient({ token: ctx.output.token }).getApiStatus();
      let calls = readOptionalNumber(data.APICallsMade, 'monthly calls made');

      return {
        profile: {
          id: createHash('sha256').update(ctx.output.token).digest('hex'),
          name: calls === undefined ? 'ShortPixel' : `ShortPixel (${calls} calls made)`
        }
      };
    }
  });

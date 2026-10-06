import { createHash } from 'node:crypto';
import { SlateAuth } from 'slates';
import { z } from 'zod';
import { validateMemToken } from './lib/client';

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
          'Your Mem API key from the API section in Mem settings. Supply the raw key, without a Bearer prefix.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: validateMemToken(ctx.input.token)
        }
      };
    },
    getProfile: async (ctx: { output: { token: string } }) => ({
      profile: {
        id: `configured-key-${createHash('sha256').update(validateMemToken(ctx.output.token)).digest('hex')}`,
        name: 'Mem API key (configured; account identity not verified)'
      }
    })
  });

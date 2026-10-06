import { createHash } from 'node:crypto';
import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('ImageKit private API key used for authentication')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Private API Key',
    key: 'private_api_key',
    inputSchema: z.object({
      token: z.string().describe('Your ImageKit private API key (starts with private_)')
    }),
    getOutput: async ctx => {
      await new Client({ token: ctx.input.token }).listFiles({ limit: 1 });
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      await new Client({ token: ctx.output.token }).listFiles({ limit: 1 });
      return {
        profile: {
          authenticationMode: 'private_api_key',
          mediaReadValidated: true,
          connectionFingerprint: createHash('sha256').update(ctx.output.token).digest('hex')
        }
      };
    }
  });

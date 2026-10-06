import { createHash } from 'node:crypto';
import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { requireToken } from './lib/validation';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z.string().describe('Papertrail API token found in your user profile settings')
    }),
    getOutput: async ctx => ({ output: { token: requireToken(ctx.input.token) } }),
    getProfile: async (ctx: { output: { token: string } }) => {
      await new Client(ctx.output).getUsage();
      // The documented usage endpoint has no identity fields; identify this verified credential without exposing it.
      return {
        profile: {
          id: createHash('sha256').update(ctx.output.token).digest('hex'),
          name: 'Papertrail API Token'
        }
      };
    }
  });

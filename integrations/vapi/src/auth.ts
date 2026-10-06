import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      region: z.enum(['us', 'eu']).optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().min(1).describe('Your private Vapi API key from the dashboard'),
      region: z
        .enum(['us', 'eu'])
        .optional()
        .describe(
          'Region of your Vapi organization; defaults to us. EU keys require the EU API.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          region: ctx.input.region ?? 'us'
        }
      };
    },
    getProfile: async (ctx: { output: { token: string; region?: 'us' | 'eu' } }) => {
      await new Client(ctx.output.token, ctx.output.region).listAssistants({ limit: 1 });

      return {
        profile: {
          name: 'Vapi Account'
        }
      };
    }
  });

import { SlateAuth } from 'slates';
import { z } from 'zod';
import { createClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string(), region: z.enum(['us', 'uk']).optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Your Stannp API key from your account settings'),
      region: z
        .enum(['us', 'uk'])
        .default('us')
        .describe('Region of your Stannp account: US or UK/EU')
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.token, region: ctx.input.region } }),
    getProfile: async (ctx: { output: { token: string; region?: 'us' | 'uk' } }) => {
      let data = await createClient(ctx.output).getAccountInfo();
      return {
        profile: {
          id: data?.id != null ? String(data.id) : undefined,
          email: data?.email ?? undefined,
          name: data?.firstname ? `${data.firstname} ${data.lastname || ''}`.trim() : undefined
        }
      };
    }
  });

import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Secret Base64 API key from LeadIQ Settings > API Keys. Paste the encoded value exactly as provided.'
        )
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.apiKey.trim() } }),
    getProfile: async (ctx: { output: { token: string } }) => {
      let account = await new Client({ token: ctx.output.token }).getAccount();
      let activePlan = account.plans.find(
        (plan: { status: string }) => plan.status === 'Active'
      );
      return { profile: { name: activePlan?.name ?? 'LeadIQ Account' } };
    }
  });

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLookupInfo = SlateTool.create(spec, {
  name: 'Get Lookup Info',
  key: 'get_lookup_info',
  description:
    'Check the organization’s standard address verification usage, free lookup limit, and subscription status before verifying addresses.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      freeLimit: z.number().nullable().describe('Lookup limit, or null for an unlimited plan'),
      subscribed: z.boolean().describe('Whether the organization has a paid plan'),
      used: z.number().describe('Lookups consumed in the current billing period')
    })
  )
  .handleInvocation(async ctx => {
    let output = await new Client({ token: ctx.auth.token }).getLookupInfo();
    return {
      output,
      message: `Used ${output.used} standard address lookups. Lookup limit: ${output.freeLimit ?? 'unlimited'}.`
    };
  })
  .build();

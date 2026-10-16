import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountUsage = SlateTool.create(spec, {
  key: 'get_account_usage',
  name: 'Get Account Usage',
  description:
    'Identify the organization associated with this API key and check its credit usage, upload storage, and subscription plan.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      organizationId: z
        .string()
        .describe('Organization identifier associated with the API key'),
      usage: z
        .record(z.string(), z.unknown())
        .describe('Organization usage and plan fields returned by the provider')
    })
  )
  .handleInvocation(async ctx => {
    let usage = await new Client(ctx.auth.token).getUsage();
    return {
      output: { organizationId: usage.identifier, usage },
      message: `Retrieved usage for organization ${usage.identifier}.`
    };
  })
  .build();

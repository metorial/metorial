import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPolicies = SlateTool.create(spec, {
  name: 'List Policies',
  key: 'list_policies',
  description: `Lists DNS filtering policies. Optionally filter by organization IDs. Returns policy configurations including allow/block lists, category settings, and application filtering rules.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationIds: z
        .array(z.string())
        .optional()
        .describe('Filter by specific organization IDs')
    })
  )
  .output(
    z.object({
      policies: z.array(z.record(z.string(), z.any())).describe('List of policy objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let policies = await client.listPolicies(ctx.input.organizationIds);

    return {
      output: { policies },
      message: `Found **${policies.length}** policy(ies).`
    };
  })
  .build();

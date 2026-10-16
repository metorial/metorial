import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getSecurityItem = SlateTool.create(spec, {
  name: 'Get Security Item',
  key: 'get_security_item',
  description:
    'Retrieve a security finding with its full remediation, advisory, dependency, ownership, and ignored-state details. Call search_security_items to discover item IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      srmItemId: z.string().describe('Security item ID from search_security_items.')
    })
  )
  .output(
    z.object({
      item: z
        .object({
          id: z.string(),
          title: z.string(),
          priority: z.string(),
          status: z.string()
        })
        .passthrough(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    let response = await createClient(ctx).getSecurityItem(ctx.input.srmItemId);
    return {
      output: { item: response.data ?? response, raw: response },
      message: 'Retrieved security finding details.'
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { accountInput, resourceOutput } from '../lib/contracts';
import { spec } from '../spec';
export const getResource = SlateTool.create(spec, {
  key: 'get_resource',
  name: 'Get Resource',
  description:
    'Read one exact campaign, ad group, ad or custom audience and verify its account association. Includes provider state and relationships for independent write readback.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      accountId: accountInput,
      resourceType: z.enum(['campaign', 'adGroup', 'ad', 'audience']),
      resourceId: z.string()
    })
  )
  .output(z.object({ resource: z.record(z.string(), z.unknown()) }))
  .handleInvocation(async ctx => ({
    output: {
      resource: resourceOutput(
        ctx.input.resourceType,
        await createClient(ctx).getResource(ctx.input.resourceType, ctx.input.resourceId)
      )
    },
    message: 'Retrieved the exact account-scoped resource.'
  }))
  .build();

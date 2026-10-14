import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getEstimate = SlateTool.create(spec, {
  name: 'Get Estimate',
  key: 'get_estimate',
  description:
    'Retrieve an estimate with its line items, amounts, client, and current status.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      estimateId: z.string().describe('Estimate ID from list_estimates or create_estimate.')
    })
  )
  .output(z.object({ estimate: z.any().describe('Complete estimate record.') }))
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.input.organizationId ?? ctx.config.organizationId
    });
    let estimate = await client.getEstimate(ctx.input.estimateId);
    return {
      output: { estimate },
      message: `Retrieved estimate ${estimate.sequence_flat || estimate.id}.`
    };
  })
  .build();

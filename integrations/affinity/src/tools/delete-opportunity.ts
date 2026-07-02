import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let deleteOpportunity = SlateTool.create(spec, {
  name: 'Delete Opportunity',
  key: 'delete_opportunity',
  description: `Permanently delete an opportunity (deal) from Affinity. This removes it from its list and deletes associated data.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      opportunityId: z.number().describe('ID of the opportunity to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    await client.deleteOpportunity(ctx.input.opportunityId);

    return {
      output: {
        success: true
      },
      message: `Deleted opportunity with ID **${ctx.input.opportunityId}**.`
    };
  })
  .build();

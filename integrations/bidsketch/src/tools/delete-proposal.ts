import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { spec } from '../spec';

export let deleteProposal = SlateTool.create(spec, {
  name: 'Delete Proposal',
  key: 'delete_proposal',
  description: `Delete a proposal and all its associated content (sections and fees) from Bidsketch.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      proposalId: z.number().describe('ID of the proposal to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);
    await client.deleteProposal(ctx.input.proposalId);

    return {
      output: { success: true },
      message: `Deleted proposal with ID **${ctx.input.proposalId}** and all associated content.`
    };
  })
  .build();

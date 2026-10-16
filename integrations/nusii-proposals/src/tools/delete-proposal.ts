import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteProposal = SlateTool.create(spec, {
  name: 'Delete Proposal',
  key: 'delete_proposal',
  description: `Permanently delete a proposal from your Nusii account. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      proposalId: z.string().describe('The ID of the proposal to delete')
    })
  )
  .output(
    z.object({
      raw: z.record(z.string(), z.unknown()).optional(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    await client.deleteProposal(ctx.input.proposalId);

    return {
      output: { success: true },
      message: `Deleted proposal with ID **${ctx.input.proposalId}**.`
    };
  })
  .build();

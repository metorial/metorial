import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let archiveProposal = SlateTool.create(spec, {
  name: 'Archive Proposal',
  key: 'archive_proposal',
  description: `Archive a proposal. Archived proposals are hidden from the default proposals list but can still be retrieved using the archived filter.`
})
  .input(
    z.object({
      proposalId: z.string().describe('The ID of the proposal to archive')
    })
  )
  .output(
    z.object({
      proposalId: z.string(),
      title: z.string(),
      status: z.string(),
      archivedAt: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.archiveProposal(ctx.input.proposalId);

    return {
      output: {
        proposalId: result.proposalId,
        title: result.title,
        status: result.status,
        archivedAt: result.archivedAt
      },
      message: `Archived proposal **"${result.title}"** (ID: ${result.proposalId}).`
    };
  })
  .build();

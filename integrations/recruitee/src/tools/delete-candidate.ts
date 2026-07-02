import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCandidate = SlateTool.create(spec, {
  name: 'Delete Candidate',
  key: 'delete_candidate',
  description: `Permanently delete a candidate from Recruitee. This removes the candidate and all associated data including placements, notes, and attachments.`,
  instructions: [
    'This action is irreversible. Make sure you have the correct candidate ID before proceeding.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      candidateId: z.number().describe('ID of the candidate to delete')
    })
  )
  .output(
    z.object({
      candidateId: z.number().describe('ID of the deleted candidate'),
      deleted: z.boolean().describe('Whether the candidate was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RecruiteeClient({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    await client.deleteCandidate(ctx.input.candidateId);

    return {
      output: {
        candidateId: ctx.input.candidateId,
        deleted: true
      },
      message: `Deleted candidate ID ${ctx.input.candidateId}.`
    };
  })
  .build();

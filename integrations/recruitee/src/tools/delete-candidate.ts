import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCandidate = SlateTool.create(spec, {
  name: 'Delete Candidate',
  key: 'delete_candidate',
  description: `Delete a candidate and return its confirmed deletion timestamp. Deleted records may remain in provider history or be retrievable; this does not guarantee erasure of associated data.`,
  instructions: [
    'Verify the exact candidate ID and retention requirements before deleting. Provider history and restoration rules remain applicable.'
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
      deleted: z.boolean().describe('Whether Recruitee confirmed a deletion timestamp'),
      deletedAt: z.string().optional().describe('Provider deletion timestamp'),
      retainedHistoryPossible: z
        .boolean()
        .optional()
        .describe('Provider history or restoration may remain')
    })
  )
  .handleInvocation(async ctx => {
    let client = await RecruiteeClient.forContext(ctx);

    let result = await client.deleteCandidate(ctx.input.candidateId);

    return {
      output: {
        candidateId: ctx.input.candidateId,
        deleted: true,
        deletedAt: String(result.candidate.deleted_at),
        retainedHistoryPossible: true
      },
      message: `Confirmed deletion of candidate ID ${ctx.input.candidateId}; provider retention rules remain.`
    };
  })
  .build();

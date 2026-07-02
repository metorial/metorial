import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCandidate = SlateTool.create(spec, {
  name: 'Delete Candidate',
  key: 'delete_candidate',
  description: `Permanently delete a candidate record from CATS. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      candidateId: z.string().describe('ID of the candidate to delete')
    })
  )
  .output(
    z.object({
      candidateId: z.string().describe('ID of the deleted candidate'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteCandidate(ctx.input.candidateId);

    return {
      output: {
        candidateId: ctx.input.candidateId,
        deleted: true
      },
      message: `Deleted candidate **${ctx.input.candidateId}**.`
    };
  })
  .build();

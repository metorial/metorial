import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';

import { spec } from '../spec';

export let cancelCandidateInvite = SlateTool.create(spec, {
  key: 'cancel_candidate_invite',
  name: 'Cancel Candidate Invite',
  description: 'Cancel an existing candidate test invitation.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      testId: z.string().describe('Test ID from list_tests'),
      candidateId: z.string().describe('Candidate ID from list_candidates')
    })
  )
  .output(
    z.object({
      cancelled: z.boolean().describe('Whether HackerRank accepted the cancellation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.cancelCandidateInvite(ctx.input.testId, ctx.input.candidateId);
    return { output: { cancelled: true }, message: 'Cancelled the candidate invitation.' };
  });

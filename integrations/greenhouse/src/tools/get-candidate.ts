import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { candidateOutputSchema, mapCandidate } from '../lib/mappers';
import { spec } from '../spec';
export const getCandidateTool = SlateTool.create(spec, {
  key: 'get_candidate',
  name: 'Get Candidate',
  description: 'Get Candidate. Uses Harvest v3 permissions and verified resource IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      candidateId: z.string().describe('The Greenhouse candidate ID')
    })
  )
  .output(candidateOutputSchema)
  .handleInvocation(async ctx => {
    return {
      output: mapCandidate(
        await new GreenhouseClient(ctx.auth, ctx.config).getCandidate(ctx.input.candidateId)
      ),
      message: 'Retrieved the requested candidate.'
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { spec } from '../spec';
export const manageCandidateTagsTool = SlateTool.create(spec, {
  key: 'manage_candidate_tags',
  name: 'Manage Candidate Tags',
  description:
    'Add or remove an existing tag on one candidate. Resolves the exact tag name and verifies membership. Does not create or delete organization-wide tag definitions.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      candidateId: z.string().describe('The candidate ID'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the tag'),
      tagName: z.string().describe('The tag name to add or remove')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      candidateId: z.string(),
      action: z.string(),
      tagName: z.string()
    })
  )
  .handleInvocation(async ctx => {
    return {
      output: await new GreenhouseClient(ctx.auth, ctx.config).manageCandidateTag(
        ctx.input.candidateId,
        ctx.input.action,
        ctx.input.tagName
      ),
      message: 'Confirmed the candidate tag membership.'
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { spec } from '../spec';

export let manageCandidateTagsTool = SlateTool.create(spec, {
  name: 'Manage Candidate Tags',
  key: 'manage_candidate_tags',
  description: `Add or remove tags on a candidate in Greenhouse. Use the action field to specify whether to add or remove the tag. Requires the **On-Behalf-Of** user ID in config.`,
  constraints: ['Requires the onBehalfOf config value to be set for audit purposes.'],
  tags: { readOnly: false }
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
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });
    let candidateId = Number.parseInt(ctx.input.candidateId, 10);

    if (ctx.input.action === 'add') {
      await client.addCandidateTag(candidateId, ctx.input.tagName);
    } else {
      await client.removeCandidateTag(candidateId, ctx.input.tagName);
    }

    return {
      output: {
        success: true,
        candidateId: ctx.input.candidateId,
        action: ctx.input.action,
        tagName: ctx.input.tagName
      },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Removed'} tag "${ctx.input.tagName}" ${ctx.input.action === 'add' ? 'to' : 'from'} candidate **${ctx.input.candidateId}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { spec } from '../spec';

export let manageCandidateTool = SlateTool.create(spec, {
  name: 'Manage Candidate',
  key: 'manage_candidate',
  description: `Perform actions on an existing candidate: move to a different pipeline stage, copy or relocate to another job, disqualify/revert disqualification, add comments, add tags, or add ratings. Choose the action to perform and provide the required parameters.`,
  instructions: [
    'Use "move" to advance a candidate to a different stage within the same job',
    'Use "copy" to add the candidate to another job while keeping them in the current one',
    'Use "relocate" to move the candidate to another job entirely (removes from current)',
    'Use "disqualify" to reject a candidate, optionally with a reason',
    'Use "revertDisqualification" to undo a disqualification',
    'Use "addComment" to leave a note on the candidate profile',
    'Use "addTag" to tag a candidate for organization/filtering'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      jobShortcode: z.string().describe('The shortcode of the job the candidate belongs to'),
      candidateId: z.string().describe('The candidate ID'),
      action: z
        .enum([
          'move',
          'copy',
          'relocate',
          'disqualify',
          'revertDisqualification',
          'addComment',
          'addTag'
        ])
        .describe('The action to perform on the candidate'),
      stageSlug: z
        .string()
        .optional()
        .describe(
          'Target stage slug (required for "move", optional for "copy" and "relocate")'
        ),
      targetJobShortcode: z
        .string()
        .optional()
        .describe('Target job shortcode (required for "copy" and "relocate")'),
      disqualificationReason: z
        .string()
        .optional()
        .describe('Reason for disqualification (optional, used with "disqualify")'),
      comment: z.string().optional().describe('Comment body (required for "addComment")'),
      tag: z.string().optional().describe('Tag to add (required for "addTag")')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      actionPerformed: z.string().describe('Description of the action performed'),
      candidateId: z.string().describe('The candidate ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let { jobShortcode, candidateId, action } = ctx.input;
    let actionDescription = '';

    switch (action) {
      case 'move': {
        if (!ctx.input.stageSlug) throw new Error('stageSlug is required for move action');
        await client.moveCandidate(jobShortcode, candidateId, ctx.input.stageSlug);
        actionDescription = `Moved candidate to stage "${ctx.input.stageSlug}"`;
        break;
      }
      case 'copy': {
        if (!ctx.input.targetJobShortcode)
          throw new Error('targetJobShortcode is required for copy action');
        await client.copyCandidate(
          jobShortcode,
          candidateId,
          ctx.input.targetJobShortcode,
          ctx.input.stageSlug
        );
        actionDescription = `Copied candidate to job ${ctx.input.targetJobShortcode}`;
        break;
      }
      case 'relocate': {
        if (!ctx.input.targetJobShortcode)
          throw new Error('targetJobShortcode is required for relocate action');
        await client.relocateCandidate(
          jobShortcode,
          candidateId,
          ctx.input.targetJobShortcode,
          ctx.input.stageSlug
        );
        actionDescription = `Relocated candidate to job ${ctx.input.targetJobShortcode}`;
        break;
      }
      case 'disqualify': {
        await client.disqualifyCandidate(
          jobShortcode,
          candidateId,
          ctx.input.disqualificationReason
        );
        actionDescription = `Disqualified candidate${ctx.input.disqualificationReason ? ` (reason: ${ctx.input.disqualificationReason})` : ''}`;
        break;
      }
      case 'revertDisqualification': {
        await client.revertDisqualification(jobShortcode, candidateId);
        actionDescription = 'Reverted candidate disqualification';
        break;
      }
      case 'addComment': {
        if (!ctx.input.comment) throw new Error('comment is required for addComment action');
        await client.addCandidateComment(jobShortcode, candidateId, ctx.input.comment);
        actionDescription = 'Added comment to candidate';
        break;
      }
      case 'addTag': {
        if (!ctx.input.tag) throw new Error('tag is required for addTag action');
        await client.addCandidateTag(jobShortcode, candidateId, ctx.input.tag);
        actionDescription = `Added tag "${ctx.input.tag}" to candidate`;
        break;
      }
    }

    return {
      output: {
        success: true,
        actionPerformed: actionDescription,
        candidateId
      },
      message: `${actionDescription} (candidate ${candidateId} in job ${jobShortcode}).`
    };
  })
  .build();

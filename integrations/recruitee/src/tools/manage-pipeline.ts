import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';

export let managePipeline = SlateTool.create(spec, {
  name: 'Manage Pipeline',
  key: 'manage_pipeline',
  description: `Move a candidate through the recruitment pipeline, disqualify them, or remove them from a job/talent pool. Use the placement ID to identify the candidate's assignment to a specific job.

To find placement IDs, use the **Get Candidate** tool which returns placements for each job the candidate is assigned to.`,
  instructions: [
    'The placementId is required for all actions. Retrieve it from the candidate details (Get Candidate tool).',
    'For "change_stage", you must provide the target stageId.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['change_stage', 'disqualify', 'remove'])
        .describe(
          '"change_stage" to move to a new stage, "disqualify" to reject, "remove" to unassign from job'
        ),
      placementId: z
        .number()
        .describe("Placement ID (candidate's assignment to a specific job)"),
      stageId: z
        .number()
        .optional()
        .describe('Target pipeline stage ID (required for "change_stage")'),
      proceed: z
        .boolean()
        .optional()
        .describe('Whether to proceed the candidate to the new stage (for "change_stage")'),
      hiredAt: z
        .string()
        .optional()
        .describe('Hire date (ISO 8601) when moving to the hired stage'),
      jobStartsAt: z.string().optional().describe('Job start date (ISO 8601) when hiring'),
      disqualifyReasonId: z
        .number()
        .optional()
        .describe(
          'Disqualification reason ID (optional for "disqualify"). Use the List Departments & Locations tool to find available reasons.'
        )
    })
  )
  .output(
    z.object({
      placementId: z.number().describe('Placement ID'),
      actionPerformed: z.string().describe('Action that was performed'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RecruiteeClient({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    if (ctx.input.action === 'change_stage') {
      if (!ctx.input.stageId) {
        throw new Error('stageId is required for change_stage action.');
      }
      await client.changeStage(ctx.input.placementId, ctx.input.stageId, {
        proceed: ctx.input.proceed,
        hiredAt: ctx.input.hiredAt,
        jobStartsAt: ctx.input.jobStartsAt
      });
      return {
        output: {
          placementId: ctx.input.placementId,
          actionPerformed: 'change_stage',
          success: true
        },
        message: `Moved placement ${ctx.input.placementId} to stage ${ctx.input.stageId}.`
      };
    }

    if (ctx.input.action === 'disqualify') {
      await client.disqualifyCandidate(ctx.input.placementId, ctx.input.disqualifyReasonId);
      return {
        output: {
          placementId: ctx.input.placementId,
          actionPerformed: 'disqualify',
          success: true
        },
        message: `Disqualified placement ${ctx.input.placementId}.`
      };
    }

    if (ctx.input.action === 'remove') {
      await client.deletePlacement(ctx.input.placementId);
      return {
        output: {
          placementId: ctx.input.placementId,
          actionPerformed: 'remove',
          success: true
        },
        message: `Removed placement ${ctx.input.placementId}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();

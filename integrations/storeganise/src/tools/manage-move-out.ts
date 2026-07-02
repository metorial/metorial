import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMoveOutTool = SlateTool.create(spec, {
  name: 'Manage Move-Out',
  key: 'manage_move_out',
  description: `Create or manage self-storage move-out jobs. Schedule a move-out, complete it, or cancel it. Use **action** to specify the operation.`,
  instructions: [
    'Set action to "create" to schedule a move-out for a unit rental.',
    'Set action to "complete" to finalize the move-out.',
    'Set action to "cancel" to cancel a scheduled move-out.',
    'Set action to "get" to retrieve details of a move-out job.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'complete', 'cancel', 'get']).describe('Action to perform'),
      jobId: z
        .string()
        .optional()
        .describe('Move-out job ID (required for complete, cancel, get)'),
      unitRentalId: z.string().optional().describe('Unit rental ID (required for create)'),
      moveOutDate: z.string().optional().describe('Scheduled move-out date in ISO format'),
      include: z
        .string()
        .optional()
        .describe('Comma-separated related data to include (for get action)')
    })
  )
  .output(
    z.object({
      moveOutJob: z.record(z.string(), z.any()).describe('Move-out job details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let jobData: Record<string, any> = {
        unitRentalId: ctx.input.unitRentalId
      };
      if (ctx.input.moveOutDate) jobData.moveOutDate = ctx.input.moveOutDate;

      let moveOutJob = await client.createMoveOutJob(jobData);
      return {
        output: { moveOutJob },
        message: `Created move-out job **${moveOutJob._id}** for rental ${ctx.input.unitRentalId}.`
      };
    }

    if (action === 'complete') {
      let moveOutJob = await client.completeMoveOutJob(ctx.input.jobId!);
      return {
        output: { moveOutJob },
        message: `Completed move-out job **${ctx.input.jobId}**.`
      };
    }

    if (action === 'cancel') {
      let moveOutJob = await client.cancelMoveOutJob(ctx.input.jobId!);
      return {
        output: { moveOutJob },
        message: `Cancelled move-out job **${ctx.input.jobId}**.`
      };
    }

    let moveOutJob = await client.getMoveOutJob(ctx.input.jobId!, ctx.input.include);
    return {
      output: { moveOutJob },
      message: `Retrieved move-out job **${ctx.input.jobId}**.`
    };
  })
  .build();

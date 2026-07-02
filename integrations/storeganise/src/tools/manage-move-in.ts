import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMoveInTool = SlateTool.create(spec, {
  name: 'Manage Move-In',
  key: 'manage_move_in',
  description: `Create or manage self-storage move-in jobs. Create a new move-in order, confirm a pending order, complete it, or cancel it. Use **action** to specify the operation.`,
  instructions: [
    'Set action to "create" to initiate a new move-in order with userId and unitId.',
    'Set action to "confirm" to approve a pending move-in (generates an invoice).',
    'Set action to "complete" to finalize a confirmed move-in.',
    'Set action to "cancel" to cancel a move-in order.',
    'Set action to "get" to retrieve details of an existing move-in job.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'confirm', 'complete', 'cancel', 'get'])
        .describe('Action to perform'),
      jobId: z
        .string()
        .optional()
        .describe('Move-in job ID (required for confirm, complete, cancel, get)'),
      userId: z.string().optional().describe('User/tenant ID (required for create)'),
      unitId: z.string().optional().describe('Unit ID to move into (required for create)'),
      siteId: z.string().optional().describe('Site ID (required for create)'),
      startDate: z.string().optional().describe('Move-in start date in ISO format'),
      include: z
        .string()
        .optional()
        .describe('Comma-separated related data to include (for get action)')
    })
  )
  .output(
    z.object({
      moveInJob: z.record(z.string(), z.any()).describe('Move-in job details')
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
        ownerId: ctx.input.userId,
        unitId: ctx.input.unitId,
        siteId: ctx.input.siteId
      };
      if (ctx.input.startDate) jobData.startDate = ctx.input.startDate;

      let moveInJob = await client.createMoveInJob(jobData);
      return {
        output: { moveInJob },
        message: `Created move-in job **${moveInJob._id}** for unit ${ctx.input.unitId}.`
      };
    }

    if (action === 'confirm') {
      let moveInJob = await client.confirmMoveInJob(ctx.input.jobId!);
      return {
        output: { moveInJob },
        message: `Confirmed move-in job **${ctx.input.jobId}**. Invoice has been generated.`
      };
    }

    if (action === 'complete') {
      let moveInJob = await client.completeMoveInJob(ctx.input.jobId!);
      return {
        output: { moveInJob },
        message: `Completed move-in job **${ctx.input.jobId}**.`
      };
    }

    if (action === 'cancel') {
      let moveInJob = await client.cancelMoveInJob(ctx.input.jobId!);
      return {
        output: { moveInJob },
        message: `Cancelled move-in job **${ctx.input.jobId}**.`
      };
    }

    let moveInJob = await client.getMoveInJob(ctx.input.jobId!, ctx.input.include);
    return {
      output: { moveInJob },
      message: `Retrieved move-in job **${ctx.input.jobId}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPlanningStatus = SlateTool.create(spec, {
  name: 'Get Planning Status',
  key: 'get_planning_status',
  description: `Check the status and progress of an asynchronous route optimization run. Also supports stopping a running optimization. Use the **planningId** returned from the Optimize Routes tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      planningId: z.string().describe('Planning ID from the Optimize Routes tool'),
      stop: z.boolean().optional().describe('Set to true to stop the running optimization')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      status: z
        .string()
        .optional()
        .describe('N=not started, R=running, C=completed, F=failed, E=error'),
      percentageComplete: z.number().optional().describe('Completion percentage (0-100)'),
      code: z.string().optional(),
      message: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.stop) {
      let stopResult = await client.stopPlanning(ctx.input.planningId);
      return {
        output: {
          success: stopResult.success,
          code: stopResult.code,
          message: stopResult.message
        },
        message: stopResult.success
          ? `Planning \`${ctx.input.planningId}\` stopped.`
          : `Failed to stop planning: ${stopResult.message || stopResult.code}`
      };
    }

    let result = await client.getPlanningStatus(ctx.input.planningId);

    let statusLabels: Record<string, string> = {
      N: 'Not started',
      R: 'Running',
      C: 'Completed',
      F: 'Failed',
      E: 'Error'
    };

    let statusLabel = statusLabels[result.status] || result.status;

    return {
      output: {
        success: result.success,
        status: result.status,
        percentageComplete: result.percentageComplete,
        code: result.code,
        message: result.message
      },
      message: result.success
        ? `Planning status: **${statusLabel}**${result.percentageComplete !== undefined ? ` (${result.percentageComplete}% complete)` : ''}`
        : `Failed to get status: ${result.message || result.code}`
    };
  })
  .build();

import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

let maintenanceRunSchema = z.object({
  maintenanceId: z.string().describe('Maintenance run ID'),
  type: z.string().optional().describe('Maintenance type'),
  state: z.string().optional().describe('Maintenance state'),
  resourceId: z.string().optional().describe('Affected resource ID'),
  scheduledAt: z.string().optional().describe('Scheduled start time'),
  pendingMaintenanceBy: z.string().optional().describe('Latest allowed scheduling time')
});

let mapMaintenanceRun = (run: any) => ({
  maintenanceId: run.id,
  type: run.type,
  state: run.state,
  resourceId: run.resourceId,
  scheduledAt: run.scheduledAt,
  pendingMaintenanceBy: run.pendingMaintenanceBy
});

export let manageMaintenance = SlateTool.create(spec, {
  name: 'Manage Maintenance',
  key: 'manage_maintenance',
  description: `List, retrieve, reschedule, or trigger Render maintenance runs for services and datastores. Use update to change scheduledAt and trigger to start a maintenance run immediately.`
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'update', 'trigger']).describe('Maintenance action'),
      maintenanceId: z
        .string()
        .optional()
        .describe('Maintenance run ID for get/update/trigger'),
      resourceId: z.string().optional().describe('Filter list by resource ID'),
      ownerId: z.string().optional().describe('Filter list by workspace ID'),
      state: z
        .enum([
          'scheduled',
          'in_progress',
          'user_fix_required',
          'cancelled',
          'succeeded',
          'failed'
        ])
        .optional()
        .describe('Filter list by maintenance state'),
      scheduledAt: z.string().optional().describe('New scheduled time for update'),
      limit: z
        .number()
        .optional()
        .describe(
          'Accepted for schema consistency; Render maintenance list is not cursor-paginated'
        ),
      cursor: z
        .string()
        .optional()
        .describe(
          'Accepted for schema consistency; Render maintenance list is not cursor-paginated'
        )
    })
  )
  .output(
    z.object({
      runs: z.array(maintenanceRunSchema).optional().describe('Maintenance runs'),
      run: maintenanceRunSchema.optional().describe('Single maintenance run'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.resourceId) params.resourceId = [ctx.input.resourceId];
      if (ctx.input.ownerId) params.ownerId = [ctx.input.ownerId];
      if (ctx.input.state) params.state = [ctx.input.state];
      let data = await client.listMaintenance(params);
      let runs = (Array.isArray(data) ? data : []).map(mapMaintenanceRun);
      return {
        output: { runs, success: true },
        message: `Found **${runs.length}** maintenance run(s).`
      };
    }

    if (!ctx.input.maintenanceId) {
      throw createApiServiceError('maintenanceId is required');
    }

    if (action === 'get') {
      let run = mapMaintenanceRun(await client.getMaintenanceRun(ctx.input.maintenanceId));
      return {
        output: { run, success: true },
        message: `Maintenance run \`${run.maintenanceId}\` state: **${run.state || 'unknown'}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.scheduledAt)
        throw createApiServiceError('scheduledAt is required for update');
      let run = mapMaintenanceRun(
        await client.updateMaintenanceRun(ctx.input.maintenanceId, {
          scheduledAt: ctx.input.scheduledAt
        })
      );
      return {
        output: { run, success: true },
        message: `Updated maintenance run \`${run.maintenanceId}\` schedule.`
      };
    }

    let run = mapMaintenanceRun(await client.triggerMaintenanceRun(ctx.input.maintenanceId));
    return {
      output: { run, success: true },
      message: `Triggered maintenance run \`${ctx.input.maintenanceId}\`.`
    };
  })
  .build();

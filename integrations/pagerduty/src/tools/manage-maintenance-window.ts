import { SlateTool } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { spec } from '../spec';

export let manageMaintenanceWindow = SlateTool.create(spec, {
  name: 'Manage Maintenance Window',
  key: 'manage_maintenance_window',
  description: `Create, list, or end PagerDuty maintenance windows. During a maintenance window, no incidents will be triggered on the affected services. Use this to schedule planned downtime.`,
  instructions: [
    'Set **action** to "create", "list", or "end".',
    'For create: **startTime**, **endTime**, **serviceIds**, and **fromEmail** are required.',
    'For end: **maintenanceWindowId** is required. This immediately ends the window.',
    'Once a maintenance window has started, it can only be ended, not deleted.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'list', 'end']).describe('Action to perform'),
      maintenanceWindowId: z
        .string()
        .optional()
        .describe('Maintenance window ID (required for end)'),
      startTime: z
        .string()
        .optional()
        .describe('Start time in ISO 8601 (required for create)'),
      endTime: z.string().optional().describe('End time in ISO 8601 (required for create)'),
      description: z.string().optional().describe('Description of the maintenance'),
      serviceIds: z
        .array(z.string())
        .optional()
        .describe('Service IDs to put in maintenance (required for create)'),
      fromEmail: z
        .string()
        .optional()
        .describe('Email of the user creating the window (required for create)'),
      filterServiceIds: z
        .array(z.string())
        .optional()
        .describe('Filter list results by service IDs'),
      filterTeamIds: z
        .array(z.string())
        .optional()
        .describe('Filter list results by team IDs'),
      limit: z.number().optional().describe('Max results for list'),
      offset: z.number().optional().describe('Pagination offset for list')
    })
  )
  .output(
    z.object({
      maintenanceWindows: z
        .array(
          z.object({
            windowId: z.string().describe('Maintenance window ID'),
            description: z.string().optional().describe('Description'),
            startTime: z.string().optional().describe('Start time'),
            endTime: z.string().optional().describe('End time'),
            serviceNames: z.array(z.string()).optional().describe('Affected service names'),
            createdBy: z.string().optional().describe('Created by user name')
          })
        )
        .optional()
        .describe('List of maintenance windows (for list action)'),
      windowId: z.string().optional().describe('Created or ended window ID'),
      ended: z.boolean().optional().describe('Whether the window was ended'),
      more: z.boolean().optional().describe('Whether more list results are available'),
      total: z.number().optional().describe('Total count for list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PagerDutyClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      region: ctx.config.region
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.startTime) throw new Error('startTime is required');
      if (!ctx.input.endTime) throw new Error('endTime is required');
      if (!ctx.input.serviceIds || ctx.input.serviceIds.length === 0)
        throw new Error('serviceIds is required');
      if (!ctx.input.fromEmail) throw new Error('fromEmail is required');

      let mw = await client.createMaintenanceWindow(
        {
          startTime: ctx.input.startTime,
          endTime: ctx.input.endTime,
          description: ctx.input.description,
          serviceIds: ctx.input.serviceIds
        },
        ctx.input.fromEmail
      );

      return {
        output: {
          windowId: mw.id
        },
        message: `Created maintenance window \`${mw.id}\` from ${mw.start_time} to ${mw.end_time}.`
      };
    }

    if (ctx.input.action === 'end') {
      if (!ctx.input.maintenanceWindowId) throw new Error('maintenanceWindowId is required');
      await client.deleteMaintenanceWindow(ctx.input.maintenanceWindowId);

      return {
        output: {
          windowId: ctx.input.maintenanceWindowId,
          ended: true
        },
        message: `Ended maintenance window \`${ctx.input.maintenanceWindowId}\`.`
      };
    }

    // List
    let result = await client.listMaintenanceWindows({
      serviceIds: ctx.input.filterServiceIds,
      teamIds: ctx.input.filterTeamIds,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let windows = result.maintenance_windows.map(mw => ({
      windowId: mw.id,
      description: mw.description,
      startTime: mw.start_time,
      endTime: mw.end_time,
      serviceNames: mw.services?.map(s => s.summary).filter(Boolean) as string[] | undefined,
      createdBy: mw.created_by?.summary
    }));

    return {
      output: {
        maintenanceWindows: windows,
        more: result.more,
        total: result.total
      },
      message: `Found **${result.total}** maintenance window(s). Returned ${windows.length} result(s).`
    };
  })
  .build();

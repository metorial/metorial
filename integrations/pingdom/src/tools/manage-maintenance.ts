import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let maintenanceOutputSchema = z.object({
  maintenanceId: z.number().describe('Maintenance window ID'),
  description: z.string().optional().describe('Description of the maintenance window'),
  from: z.number().optional().describe('Start timestamp (Unix epoch)'),
  to: z.number().optional().describe('End timestamp (Unix epoch)'),
  recurrenceType: z.string().optional().describe('Recurrence type: none, day, week, month'),
  repeatEvery: z.number().optional().describe('Repeat interval'),
  effectiveTo: z.number().optional().describe('Recurrence end timestamp (Unix epoch)'),
  checks: z
    .object({
      uptime: z.array(z.number()).optional().describe('Uptime check IDs'),
      tms: z.array(z.number()).optional().describe('Transaction check IDs')
    })
    .optional()
    .describe('Associated checks')
});

export let listMaintenance = SlateTool.create(spec, {
  name: 'List Maintenance Windows',
  key: 'list_maintenance',
  description: `Lists all maintenance windows in your Pingdom account. Maintenance windows suppress alerts during planned downtime.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Offset for pagination'),
      orderBy: z.string().optional().describe('Order by field')
    })
  )
  .output(
    z.object({
      maintenance: z.array(maintenanceOutputSchema).describe('List of maintenance windows')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.listMaintenance({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      orderby: ctx.input.orderBy
    });

    let maintenance = (result.maintenance || []).map((m: any) => ({
      maintenanceId: m.id,
      description: m.description,
      from: m.from,
      to: m.to,
      recurrenceType: m.recurrencetype,
      repeatEvery: m.repeatevery,
      effectiveTo: m.effectiveto,
      checks: m.checks
        ? {
            uptime: m.checks.uptime,
            tms: m.checks.tms
          }
        : undefined
    }));

    return {
      output: { maintenance },
      message: `Found **${maintenance.length}** maintenance window(s).`
    };
  })
  .build();

export let createMaintenance = SlateTool.create(spec, {
  name: 'Create Maintenance Window',
  key: 'create_maintenance',
  description: `Creates a maintenance window to suppress alerts during planned downtime. Checks associated with the window will be paused during the maintenance period.`,
  instructions: [
    'From and to timestamps must be Unix epoch timestamps.',
    'Only future maintenance windows can be created.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      description: z.string().describe('Description of the maintenance window'),
      from: z.number().describe('Start timestamp (Unix epoch)'),
      to: z.number().describe('End timestamp (Unix epoch)'),
      recurrenceType: z
        .enum(['none', 'day', 'week', 'month'])
        .optional()
        .describe('Recurrence type. Default: none'),
      repeatEvery: z
        .number()
        .optional()
        .describe('Repeat every N intervals (e.g. every 2 weeks)'),
      effectiveTo: z.number().optional().describe('End of recurrence (Unix epoch)'),
      uptimeIds: z.array(z.number()).optional().describe('Uptime check IDs to include'),
      tmsIds: z.array(z.number()).optional().describe('Transaction check IDs to include')
    })
  )
  .output(
    z.object({
      maintenanceId: z.number().describe('ID of the created maintenance window')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let data: Record<string, any> = {
      description: ctx.input.description,
      from: ctx.input.from,
      to: ctx.input.to
    };

    if (ctx.input.recurrenceType) data.recurrencetype = ctx.input.recurrenceType;
    if (ctx.input.repeatEvery !== undefined) data.repeatevery = ctx.input.repeatEvery;
    if (ctx.input.effectiveTo !== undefined) data.effectiveto = ctx.input.effectiveTo;
    if (ctx.input.uptimeIds?.length) data.uptimeids = ctx.input.uptimeIds.join(',');
    if (ctx.input.tmsIds?.length) data.tmsids = ctx.input.tmsIds.join(',');

    let result = await client.createMaintenance(data);
    let maint = result.maintenance || result;

    return {
      output: { maintenanceId: maint.id },
      message: `Created maintenance window **${ctx.input.description}** (ID: ${maint.id}).`
    };
  })
  .build();

export let updateMaintenance = SlateTool.create(spec, {
  name: 'Update Maintenance Window',
  key: 'update_maintenance',
  description: `Updates an existing maintenance window. Only the description and end time (to) can be modified.`,
  constraints: [
    'Only the description and "to" timestamp can be updated on an existing maintenance window.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      maintenanceId: z.number().describe('ID of the maintenance window to update'),
      description: z.string().optional().describe('New description'),
      to: z.number().optional().describe('New end timestamp (Unix epoch)')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let data: Record<string, any> = {};
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.to !== undefined) data.to = ctx.input.to;

    let result = await client.updateMaintenance(ctx.input.maintenanceId, data);

    return {
      output: { message: result.message || 'Maintenance window updated successfully' },
      message: `Updated maintenance window **${ctx.input.maintenanceId}**.`
    };
  })
  .build();

export let deleteMaintenance = SlateTool.create(spec, {
  name: 'Delete Maintenance Window',
  key: 'delete_maintenance',
  description: `Deletes a maintenance window. Only future maintenance windows can be deleted.`,
  constraints: [
    'Only future maintenance windows (where both from and to are in the future) can be deleted.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      maintenanceId: z.number().describe('ID of the maintenance window to delete')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.deleteMaintenance(ctx.input.maintenanceId);

    return {
      output: { message: result.message || 'Maintenance window deleted successfully' },
      message: `Deleted maintenance window **${ctx.input.maintenanceId}**.`
    };
  })
  .build();

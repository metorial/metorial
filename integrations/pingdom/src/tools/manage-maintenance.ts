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
      orderBy: z.string().optional().describe('Order by description, from, to or effectiveto'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      returnedCount: z.number().describe('Number of records returned in this response'),
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
      orderby: ctx.input.orderBy,
      order: ctx.input.order
    });

    let maintenance = result.maintenance.map(m => ({
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
      output: { maintenance, returnedCount: maintenance.length },
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

    let data: Record<string, unknown> = {
      description: ctx.input.description,
      from: ctx.input.from,
      to: ctx.input.to
    };

    if (ctx.input.recurrenceType) data.recurrencetype = ctx.input.recurrenceType;
    if (ctx.input.repeatEvery !== undefined) data.repeatevery = ctx.input.repeatEvery;
    if (ctx.input.effectiveTo !== undefined) data.effectiveto = ctx.input.effectiveTo;
    if (ctx.input.uptimeIds !== undefined) data.uptimeids = ctx.input.uptimeIds;
    if (ctx.input.tmsIds !== undefined) data.tmsids = ctx.input.tmsIds;

    let result = await client.createMaintenance(data);
    let maint = result.maintenance;

    return {
      output: { maintenanceId: maint.id },
      message: `Created maintenance window **${ctx.input.description}** (ID: ${maint.id}).`
    };
  })
  .build();

export let updateMaintenance = SlateTool.create(spec, {
  name: 'Update Maintenance Window',
  key: 'update_maintenance',
  description: `Updates an existing maintenance window. Supports description, timing, recurrence and associated check updates.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      maintenanceId: z.number().describe('ID of the maintenance window to update'),
      description: z.string().optional().describe('New description'),
      to: z.number().optional().describe('New end timestamp (Unix epoch)'),
      from: z.number().optional().describe('New start timestamp (Unix epoch)'),
      recurrenceType: z
        .enum(['none', 'day', 'week', 'month'])
        .optional()
        .describe('Recurrence type'),
      repeatEvery: z.number().optional().describe('Repeat every N intervals'),
      effectiveTo: z.number().optional().describe('Recurrence end timestamp'),
      uptimeIds: z
        .array(z.number())
        .optional()
        .describe('Replace uptime check IDs, including an empty list'),
      tmsIds: z
        .array(z.number())
        .optional()
        .describe('Replace transaction check IDs, including an empty list')
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

    let data: Record<string, unknown> = {};
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.to !== undefined) data.to = ctx.input.to;
    if (ctx.input.from !== undefined) data.from = ctx.input.from;
    if (ctx.input.recurrenceType !== undefined) data.recurrencetype = ctx.input.recurrenceType;
    if (ctx.input.repeatEvery !== undefined) data.repeatevery = ctx.input.repeatEvery;
    if (ctx.input.effectiveTo !== undefined) data.effectiveto = ctx.input.effectiveTo;
    if (ctx.input.uptimeIds !== undefined) data.uptimeids = ctx.input.uptimeIds;
    if (ctx.input.tmsIds !== undefined) data.tmsids = ctx.input.tmsIds;

    let result = await client.updateMaintenance(ctx.input.maintenanceId, data);

    return {
      output: {
        message:
          ('message' in result && typeof result.message === 'string'
            ? result.message
            : undefined) || 'Maintenance window updated successfully'
      },
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
      output: {
        message:
          ('message' in result && typeof result.message === 'string'
            ? result.message
            : undefined) || 'Maintenance window deleted successfully'
      },
      message: `Deleted maintenance window **${ctx.input.maintenanceId}**.`
    };
  })
  .build();

export const getMaintenance = SlateTool.create(spec, {
  name: 'Get Maintenance Window',
  key: 'get_maintenance',
  description:
    'Retrieves a maintenance window, including its schedule, recurrence and associated check IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      maintenanceId: z
        .number()
        .int()
        .positive()
        .describe('Maintenance ID from list_maintenance')
    })
  )
  .output(maintenanceOutputSchema)
  .handleInvocation(async ctx => {
    const window = (await new Client(ctx.auth).getMaintenance(ctx.input.maintenanceId))
      .maintenance;
    return {
      output: {
        maintenanceId: window.id,
        description: window.description,
        from: window.from,
        to: window.to,
        recurrenceType: window.recurrencetype,
        repeatEvery: window.repeatevery,
        effectiveTo: window.effectiveto,
        checks: window.checks
      },
      message: `Retrieved maintenance window ${window.id}.`
    };
  })
  .build();

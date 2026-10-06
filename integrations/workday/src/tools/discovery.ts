import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { limitSchema, offsetSchema, workerIdSchema } from '../lib/contracts';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current Worker',
  key: 'get_current_user',
  description:
    'Discover the worker bound to the connected Workday account. Returns only the worker ID and display name. Integration system users and other service accounts may not have a worker identity.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      workerId: z.string().describe('Connected worker ID'),
      displayName: z.string().describe('Connected worker display name')
    })
  )
  .handleInvocation(async ctx => {
    const worker = await createClient(ctx.auth, ctx.config).getWorker('me', true);
    return {
      output: { workerId: worker.id, displayName: worker.descriptor },
      message: 'Discovered the connected worker identity.'
    };
  })
  .build();

export const getResource = SlateTool.create(spec, {
  name: 'Get Resource',
  key: 'get_resource',
  description:
    'Read an exact supervisory organization, inbox task, time-off detail, or recorded time block. Discover IDs with list_organizations, get_inbox_tasks, get_time_off_entries or get_time_blocks.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      type: z
        .enum(['organization', 'inbox_task', 'time_off_entry', 'time_block'])
        .describe('Exact resource kind'),
      resourceId: z.string().describe('Exact ID returned by the matching discovery tool'),
      workerId: workerIdSchema
        .optional()
        .describe('Required for inbox_task and time_off_entry; omitted for other kinds')
    })
  )
  .output(
    z.object({ resource: z.record(z.string(), z.unknown()).describe('Native resource data') })
  )
  .handleInvocation(async ctx => ({
    output: {
      resource: await createClient(ctx.auth, ctx.config).getResource(
        ctx.input.type,
        ctx.input.resourceId,
        ctx.input.workerId
      )
    },
    message: 'Retrieved the exact authorized resource.'
  }))
  .build();

export const listResources = SlateTool.create(spec, {
  name: 'List Resources',
  key: 'list_resources',
  description:
    'Discover prerequisites for existing Workday actions: eligible absence types and valid time-off dates, or WQL data sources and fields. IDs and units depend on the connected account and worker.',
  instructions: [
    'Before request_time_off, discover eligible_absence_types for the worker, then valid_time_off_dates for the chosen type and date. Do not assume the quantity is measured in hours.',
    'Before execute_wql, discover wql_data_sources then wql_fields for a chosen dataSourceId.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      type: z
        .enum([
          'eligible_absence_types',
          'valid_time_off_dates',
          'wql_data_sources',
          'wql_fields'
        ])
        .describe('Prerequisite collection'),
      workerId: workerIdSchema.optional(),
      timeOffTypeId: z
        .string()
        .optional()
        .describe('Required for valid_time_off_dates; discover with eligible_absence_types'),
      date: z
        .string()
        .optional()
        .describe('YYYY-MM-DD date required for valid_time_off_dates'),
      positionId: z
        .string()
        .optional()
        .describe('Only for valid_time_off_dates when required by the eligible absence type'),
      dataSourceId: z
        .string()
        .optional()
        .describe('Only for wql_fields; discover with wql_data_sources'),
      search: z
        .string()
        .optional()
        .describe('Optional descriptor search for WQL collections only'),
      limit: limitSchema,
      offset: offsetSchema
    })
  )
  .output(
    z.object({
      resources: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Native resource summaries'),
      total: z.number().describe('Total matching resources')
    })
  )
  .handleInvocation(async ctx => {
    const result = await createClient(ctx.auth, ctx.config).listResources(
      ctx.input.type,
      ctx.input
    );
    return {
      output: { resources: result.data, total: result.total },
      message: `Retrieved ${result.data.length} prerequisite resources.`
    };
  })
  .build();

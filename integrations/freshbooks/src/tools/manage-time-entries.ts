import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

export let manageTimeEntries = SlateTool.create(spec, {
  name: 'Manage Time Entries',
  key: 'manage_time_entries',
  description: `Create, update, or delete time entries in FreshBooks. Log time worked against clients and projects with duration, notes, and billable status. Requires a **businessId** in the configuration.`,
  instructions: [
    'Duration is specified in seconds (e.g., 3600 = 1 hour).',
    'startedAt is a UTC Unix timestamp.',
    'Requires businessId to be set in the configuration.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      timeEntryId: z
        .number()
        .optional()
        .describe('Time entry ID (required for update/delete)'),
      duration: z.number().optional().describe('Duration in seconds (e.g. 3600 for 1 hour)'),
      startedAt: z
        .string()
        .optional()
        .describe('UTC timestamp when work began (ISO 8601 or Unix timestamp)'),
      clientId: z.number().optional().describe('Client ID to bill'),
      projectId: z.number().optional().describe('Project ID to associate with'),
      note: z.string().optional().describe('Description of work performed'),
      billable: z
        .boolean()
        .optional()
        .describe('Whether this time is billable (default: true)'),
      isLogged: z
        .boolean()
        .optional()
        .describe(
          'Whether to stop the timer (true = stopped/logged, false = timer still running)'
        )
    })
  )
  .output(
    z.object({
      timeEntryId: z.number(),
      duration: z.number().nullable().optional(),
      startedAt: z.string().nullable().optional(),
      clientId: z.number().nullable().optional(),
      projectId: z.number().nullable().optional(),
      note: z.string().nullable().optional(),
      billable: z.boolean().nullable().optional(),
      billed: z.boolean().nullable().optional(),
      isLogged: z.boolean().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshBooksClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      businessId: ctx.config.businessId
    });

    let buildPayload = () => {
      let payload: Record<string, any> = {};
      if (ctx.input.duration !== undefined) payload.duration = ctx.input.duration;
      if (ctx.input.startedAt !== undefined) payload.started_at = ctx.input.startedAt;
      if (ctx.input.clientId !== undefined) payload.client_id = ctx.input.clientId;
      if (ctx.input.projectId !== undefined) payload.project_id = ctx.input.projectId;
      if (ctx.input.note !== undefined) payload.note = ctx.input.note;
      if (ctx.input.billable !== undefined) payload.billable = ctx.input.billable;
      if (ctx.input.isLogged !== undefined) payload.is_logged = ctx.input.isLogged;
      return payload;
    };

    let mapResult = (raw: any) => ({
      timeEntryId: raw.id,
      duration: raw.duration,
      startedAt: raw.started_at,
      clientId: raw.client_id,
      projectId: raw.project_id,
      note: raw.note,
      billable: raw.billable,
      billed: raw.billed,
      isLogged: raw.is_logged
    });

    if (ctx.input.action === 'create') {
      let result = await client.createTimeEntry(buildPayload());
      return {
        output: mapResult(result),
        message: `Created time entry (ID: ${result.id}) - ${result.duration ? `${Math.round(result.duration / 60)} minutes` : 'timer started'}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.timeEntryId) throw new Error('timeEntryId is required for update');
      let result = await client.updateTimeEntry(ctx.input.timeEntryId, buildPayload());
      return {
        output: mapResult(result),
        message: `Updated time entry (ID: ${ctx.input.timeEntryId}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.timeEntryId) throw new Error('timeEntryId is required for delete');
      await client.deleteTimeEntry(ctx.input.timeEntryId);
      return {
        output: {
          timeEntryId: ctx.input.timeEntryId
        },
        message: `Deleted time entry (ID: ${ctx.input.timeEntryId}).`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();

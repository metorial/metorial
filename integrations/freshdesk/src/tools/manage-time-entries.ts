import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let listTimeEntries = SlateTool.create(spec, {
  name: 'List Time Entries',
  key: 'list_time_entries',
  description: `Lists all time entries logged on a specific ticket. Shows agent, hours spent, billable status, and notes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket to list time entries for')
    })
  )
  .output(
    z.object({
      timeEntries: z
        .array(
          z.object({
            timeEntryId: z.number().describe('Time entry ID'),
            ticketId: z.number().describe('Parent ticket ID'),
            agentId: z.number().describe('Agent who logged the time'),
            billable: z.boolean().describe('Whether the time is billable'),
            timeSpent: z.string().describe('Time spent in HH:MM format'),
            note: z.string().nullable().describe('Note describing the work done'),
            timerRunning: z.boolean().describe('Whether the timer is currently running'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of time entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let entries = await client.listTimeEntries(ctx.input.ticketId);

    let mapped = entries.map((e: any) => ({
      timeEntryId: e.id,
      ticketId: e.ticket_id ?? ctx.input.ticketId,
      agentId: e.agent_id,
      billable: e.billable ?? false,
      timeSpent: e.time_spent ?? '00:00',
      note: e.note ?? null,
      timerRunning: e.timer_running ?? false,
      createdAt: e.created_at,
      updatedAt: e.updated_at
    }));

    return {
      output: { timeEntries: mapped },
      message: `Retrieved **${mapped.length}** time entries for ticket **#${ctx.input.ticketId}**`
    };
  })
  .build();

export let createTimeEntry = SlateTool.create(spec, {
  name: 'Create Time Entry',
  key: 'create_time_entry',
  description: `Logs a time entry on a ticket. Supports setting time spent, billable status, agent, and notes.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket to log time on'),
      timeSpent: z
        .string()
        .describe('Time spent in HH:MM format (e.g., "01:30" for 1 hour 30 minutes)'),
      agentId: z
        .number()
        .optional()
        .describe(
          'ID of the agent who performed the work. Defaults to the authenticated agent.'
        ),
      billable: z
        .boolean()
        .optional()
        .describe('Whether the time is billable. Defaults to true.'),
      note: z.string().optional().describe('Note describing the work performed')
    })
  )
  .output(
    z.object({
      timeEntryId: z.number().describe('ID of the created time entry'),
      ticketId: z.number().describe('Parent ticket ID'),
      timeSpent: z.string().describe('Time spent in HH:MM format'),
      billable: z.boolean().describe('Whether the time is billable'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let entryData: Record<string, any> = {
      time_spent: ctx.input.timeSpent
    };

    if (ctx.input.agentId !== undefined) entryData.agent_id = ctx.input.agentId;
    if (ctx.input.billable !== undefined) entryData.billable = ctx.input.billable;
    if (ctx.input.note) entryData.note = ctx.input.note;

    let entry = await client.createTimeEntry(ctx.input.ticketId, entryData);

    return {
      output: {
        timeEntryId: entry.id,
        ticketId: entry.ticket_id ?? ctx.input.ticketId,
        timeSpent: entry.time_spent,
        billable: entry.billable ?? true,
        createdAt: entry.created_at
      },
      message: `Logged **${entry.time_spent}** on ticket **#${ctx.input.ticketId}**`
    };
  })
  .build();

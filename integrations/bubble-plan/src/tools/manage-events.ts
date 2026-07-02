import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `Retrieve calendar events from Project Bubble. Supports filtering by project and date ranges.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().optional().describe('Filter events by project ID'),
      from: z.string().optional().describe('Filter events from this date (yyyymmdd format)'),
      to: z.string().optional().describe('Filter events to this date (yyyymmdd format)'),
      startFrom: z.string().optional().describe('Filter by start date from (yyyymmdd)'),
      startTo: z.string().optional().describe('Filter by start date to (yyyymmdd)'),
      dueFrom: z.string().optional().describe('Filter by due date from (yyyymmdd)'),
      dueTo: z.string().optional().describe('Filter by due date to (yyyymmdd)'),
      limit: z.number().optional().describe('Maximum number of records (max 1000)'),
      offset: z.number().optional().describe('Starting position for pagination')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventId: z.string().describe('Event ID'),
            eventName: z.string().describe('Event name'),
            startDate: z.string().optional().describe('Event start date'),
            dueDate: z.string().optional().describe('Event due date'),
            projectId: z.string().optional().describe('Associated project ID'),
            userId: z.string().optional().describe('Creator user ID'),
            dateCreated: z.string().optional().describe('Date created')
          })
        )
        .describe('List of events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.getEvents({
      projectId: ctx.input.projectId,
      from: ctx.input.from,
      to: ctx.input.to,
      startFrom: ctx.input.startFrom,
      startTo: ctx.input.startTo,
      dueFrom: ctx.input.dueFrom,
      dueTo: ctx.input.dueTo,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let data = Array.isArray(result?.data) ? result.data : result?.data ? [result.data] : [];

    let events = data.map((e: any) => ({
      eventId: String(e.event_id),
      eventName: e.event_name || '',
      startDate: e.start_date || undefined,
      dueDate: e.due_date || undefined,
      projectId: e.project_id ? String(e.project_id) : undefined,
      userId: e.user_id ? String(e.user_id) : undefined,
      dateCreated: e.date_created || undefined
    }));

    return {
      output: { events },
      message: `Found **${events.length}** event(s).`
    };
  })
  .build();

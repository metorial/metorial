import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let listCalendarEventsTool = SlateTool.create(spec, {
  name: 'List Calendar Events',
  key: 'list_calendar_events',
  description: `List calendar events across courses, groups, and users. Filter by date range, context codes, and event type. Returns events and optionally assignments with due dates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['event', 'assignment'])
        .optional()
        .describe('Filter by event type or assignment due date'),
      startDate: z
        .string()
        .optional()
        .describe('Start of date range (ISO 8601, e.g., 2024-01-01)'),
      endDate: z.string().optional().describe('End of date range (ISO 8601)'),
      contextCodes: z
        .array(z.string())
        .optional()
        .describe('Context codes to filter (e.g., ["course_123", "user_456"])'),
      allEvents: z
        .boolean()
        .optional()
        .describe('Include all events, not just undated/in date range')
    })
  )
  .output(
    z.object({
      events: z.array(
        z.object({
          eventId: z.string().describe('Calendar event ID'),
          title: z.string().describe('Event title'),
          startAt: z.string().optional().nullable().describe('Start date/time'),
          endAt: z.string().optional().nullable().describe('End date/time'),
          contextCode: z.string().optional().describe('Context code'),
          description: z.string().optional().nullable().describe('Event description'),
          locationName: z.string().optional().nullable().describe('Location name'),
          workflowState: z.string().optional().describe('Event state'),
          eventType: z.string().optional().describe('Event or assignment')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CanvasClient({
      token: ctx.auth.token,
      canvasDomain: ctx.auth.canvasDomain
    });

    let raw = await client.listCalendarEvents({
      type: ctx.input.type,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      contextCodes: ctx.input.contextCodes,
      allEvents: ctx.input.allEvents
    });

    let events = raw.map((e: any) => ({
      eventId: String(e.id),
      title: e.title,
      startAt: e.start_at,
      endAt: e.end_at,
      contextCode: e.context_code,
      description: e.description,
      locationName: e.location_name,
      workflowState: e.workflow_state,
      eventType: e.type
    }));

    return {
      output: { events },
      message: `Found **${events.length}** calendar event(s).`
    };
  })
  .build();

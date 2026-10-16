import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createCanvasClient } from '../lib/client';
import { spec } from '../spec';

export let manageCalendarEventTool = SlateTool.create(spec, {
  name: 'Manage Calendar Event',
  key: 'manage_calendar_event',
  description: `Create, update, or delete a calendar event. Events can be associated with courses, groups, or individual users via context codes (e.g., "course_123", "user_456").`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      eventId: z
        .string()
        .optional()
        .describe('Calendar event ID (required for update/delete)'),
      contextCode: z
        .string()
        .optional()
        .describe('Context code like "course_123" or "user_456" (required for create)'),
      title: z.string().optional().describe('Event title'),
      description: z.string().optional().describe('Event description (HTML)'),
      startAt: z.string().optional().describe('Start date/time (ISO 8601)'),
      endAt: z.string().optional().describe('End date/time (ISO 8601)'),
      locationName: z.string().optional().describe('Location name'),
      locationAddress: z.string().optional().describe('Location address'),
      cancelReason: z.string().optional().describe('Reason for cancellation (for delete)')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete Canvas response'),
      eventId: z.string().describe('Calendar event ID'),
      title: z.string().optional().describe('Event title'),
      startAt: z.string().optional().nullable().describe('Start date/time'),
      endAt: z.string().optional().nullable().describe('End date/time'),
      contextCode: z.string().optional().describe('Context code'),
      locationName: z.string().optional().nullable().describe('Location name'),
      workflowState: z.string().optional().describe('Event state')
    })
  )
  .handleInvocation(async ctx => {
    let client = createCanvasClient(ctx.auth, ctx.config);

    if (ctx.input.action === 'create' && !ctx.input.contextCode) {
      throw createApiServiceError('contextCode is required when creating a calendar event.');
    }
    let eventData: Record<string, any> = {};
    if (ctx.input.contextCode) eventData.context_code = ctx.input.contextCode;
    if (ctx.input.title !== undefined) eventData.title = ctx.input.title;
    if (ctx.input.description !== undefined) eventData.description = ctx.input.description;
    if (ctx.input.startAt !== undefined) eventData.start_at = ctx.input.startAt;
    if (ctx.input.endAt !== undefined) eventData.end_at = ctx.input.endAt;
    if (ctx.input.locationName !== undefined) eventData.location_name = ctx.input.locationName;
    if (ctx.input.locationAddress !== undefined)
      eventData.location_address = ctx.input.locationAddress;

    let result: any;
    let actionDesc: string;

    if (ctx.input.action === 'create') {
      result = await client.createCalendarEvent(eventData);
      actionDesc = 'Created';
    } else if (ctx.input.action === 'update') {
      if (!ctx.input.eventId) throw createApiServiceError('eventId is required for update');
      result = await client.updateCalendarEvent(ctx.input.eventId, eventData);
      actionDesc = 'Updated';
    } else {
      if (!ctx.input.eventId) throw createApiServiceError('eventId is required for delete');
      result = await client.deleteCalendarEvent(ctx.input.eventId, ctx.input.cancelReason);
      actionDesc = 'Deleted';
    }

    return {
      output: {
        raw: result,
        eventId: String(result.id),
        title: result.title,
        startAt: result.start_at,
        endAt: result.end_at,
        contextCode: result.context_code,
        locationName: result.location_name,
        workflowState: result.workflow_state
      },
      message: `${actionDesc} calendar event **${result.title}** (ID: ${result.id}).`
    };
  })
  .build();

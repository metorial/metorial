import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateEvent = SlateTool.create(spec, {
  name: 'Update Event',
  key: 'update_event',
  description: `Update an existing calendar event in Project Bubble. Modify the name, dates, or project association.`
})
  .input(
    z.object({
      eventId: z.string().describe('ID of the event to update'),
      eventName: z.string().optional().describe('New event name'),
      startDate: z.string().optional().describe('New start date (yyyymmdd format)'),
      dueDate: z.string().optional().describe('New due/end date (yyyymmdd format)'),
      projectId: z.string().optional().describe('New project ID to associate'),
      userId: z.string().optional().describe('New user ID')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('ID of the updated event'),
      eventName: z.string().describe('Name of the updated event')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.updateEvent(ctx.input.eventId, {
      eventName: ctx.input.eventName,
      startDate: ctx.input.startDate,
      dueDate: ctx.input.dueDate,
      projectId: ctx.input.projectId,
      userId: ctx.input.userId
    });

    let e = result?.data?.[0] || result?.data || result;

    return {
      output: {
        eventId: String(e.event_id || ctx.input.eventId),
        eventName: e.event_name || ''
      },
      message: `Updated event **${e.event_name || ctx.input.eventId}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEvent = SlateTool.create(spec, {
  name: 'Create Event',
  key: 'create_event',
  description: `Create a new calendar event in Project Bubble. Events require a name, start date, and due date. Optionally associate with a project.`
})
  .input(
    z.object({
      eventName: z.string().describe('Name of the event'),
      startDate: z.string().describe('Event start date (yyyymmdd format)'),
      dueDate: z.string().describe('Event due/end date (yyyymmdd format)'),
      projectId: z.string().optional().describe('Project ID to associate the event with'),
      userId: z.string().optional().describe('User ID for the event creator')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('ID of the created event'),
      eventName: z.string().describe('Name of the created event')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.createEvent({
      eventName: ctx.input.eventName,
      startDate: ctx.input.startDate,
      dueDate: ctx.input.dueDate,
      projectId: ctx.input.projectId,
      userId: ctx.input.userId
    });

    let e = result?.data?.[0] || result?.data || result;

    return {
      output: {
        eventId: String(e.event_id),
        eventName: e.event_name || ctx.input.eventName
      },
      message: `Created event **${e.event_name || ctx.input.eventName}**.`
    };
  })
  .build();

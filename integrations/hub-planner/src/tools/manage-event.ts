import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageEvent = SlateTool.create(spec, {
  name: 'Manage Event',
  key: 'manage_event',
  description: `Create, update, or delete an event in Hub Planner. Events are schedulable items similar to projects but for non-project activities.
When creating, **name** is required.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      eventId: z.string().optional().describe('Event ID, required for update and delete'),
      name: z.string().optional().describe('Event name, required for create'),
      eventCode: z.string().optional().describe('Unique event code'),
      backgroundColor: z.string().optional().describe('Hex color code'),
      metadata: z.string().optional().describe('Custom metadata')
    })
  )
  .output(
    z.object({
      eventId: z.string().optional().describe('Event ID'),
      name: z.string().optional().describe('Event name'),
      eventCode: z.string().optional().describe('Event code'),
      backgroundColor: z.string().optional().describe('Background color'),
      createdDate: z.string().optional().describe('Creation timestamp'),
      updatedDate: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, eventId, ...fields } = ctx.input;

    if (action === 'create') {
      let result = await client.createEvent(fields);
      return {
        output: {
          eventId: result._id,
          name: result.name,
          eventCode: result.eventCode,
          backgroundColor: result.backgroundColor,
          createdDate: result.createdDate,
          updatedDate: result.updatedDate
        },
        message: `Created event **${result.name}** (ID: \`${result._id}\`).`
      };
    }

    if (action === 'update') {
      if (!eventId) throw new Error('eventId is required for update');
      let existing = await client.getEvent(eventId);
      let result = await client.updateEvent(eventId, { ...existing, ...fields });
      return {
        output: {
          eventId: result._id,
          name: result.name,
          eventCode: result.eventCode,
          backgroundColor: result.backgroundColor,
          createdDate: result.createdDate,
          updatedDate: result.updatedDate
        },
        message: `Updated event **${result.name}** (ID: \`${result._id}\`).`
      };
    }

    if (!eventId) throw new Error('eventId is required for delete');
    await client.deleteEvent(eventId);
    return {
      output: { eventId },
      message: `Deleted event \`${eventId}\`.`
    };
  })
  .build();

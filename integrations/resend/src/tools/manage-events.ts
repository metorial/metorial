import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let eventFieldTypeSchema = z.enum(['string', 'number', 'boolean', 'date']);

let eventSchemaSchema = z
  .record(z.string(), eventFieldTypeSchema)
  .describe('Flat event payload schema. Values must be string, number, boolean, or date.');

let eventOutputSchema = z.object({
  eventId: z.string().optional().describe('Event ID.'),
  name: z.string().optional().describe('Event name.'),
  schema: z.record(z.string(), z.string()).optional().nullable().describe('Payload schema.'),
  createdAt: z.string().optional().describe('Creation timestamp.')
});

let mapEvent = (event: any) => ({
  eventId: event.id,
  name: event.name ?? event.event,
  schema: event.schema,
  createdAt: event.created_at
});

export let createEvent = SlateTool.create(spec, {
  name: 'Create Event',
  key: 'create_event',
  description: `Create a named Resend event that can be used to trigger automations.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z
        .string()
        .describe('Event name. Dot notation is recommended, such as user.created.'),
      schema: eventSchemaSchema.optional().describe('Optional flat payload schema.')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('ID of the created event.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createEvent({
      name: ctx.input.name,
      schema: ctx.input.schema
    });

    return {
      output: { eventId: result.id },
      message: `Event **${ctx.input.name}** created with ID \`${result.id}\`.`
    };
  })
  .build();

export let sendEvent = SlateTool.create(spec, {
  name: 'Send Event',
  key: 'send_event',
  description: `Send a named Resend event to trigger matching enabled automations for a contact ID or email address.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      event: z.string().describe('Event name to trigger.'),
      contactId: z
        .string()
        .optional()
        .describe('Contact ID to associate with this event. Do not provide with email.'),
      email: z
        .string()
        .optional()
        .describe(
          'Email address to associate with this event. Do not provide with contactId.'
        ),
      payload: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom payload used by matching automations.')
    })
  )
  .output(
    z.object({
      event: z.string().describe('Event name that was sent.')
    })
  )
  .handleInvocation(async ctx => {
    if (
      (ctx.input.contactId && ctx.input.email) ||
      (!ctx.input.contactId && !ctx.input.email)
    ) {
      throw createApiServiceError(
        'Provide exactly one of contactId or email when sending an event.'
      );
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.sendEvent({
      event: ctx.input.event,
      contactId: ctx.input.contactId,
      email: ctx.input.email,
      payload: ctx.input.payload
    });

    return {
      output: { event: result.event ?? ctx.input.event },
      message: `Event **${result.event ?? ctx.input.event}** sent.`
    };
  })
  .build();

export let getEvent = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: `Retrieve a Resend event by ID or name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventIdOrName: z.string().describe('Event ID or event name.')
    })
  )
  .output(eventOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let event = await client.getEvent(ctx.input.eventIdOrName);

    return {
      output: mapEvent(event),
      message: `Event **${event.name ?? event.id}** retrieved.`
    };
  })
  .build();

export let updateEvent = SlateTool.create(spec, {
  name: 'Update Event',
  key: 'update_event',
  description: `Update the flat payload schema for a Resend event, or clear it with null.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      eventIdOrName: z.string().describe('Event ID or event name.'),
      schema: eventSchemaSchema.nullable().describe('Updated schema, or null to clear it.')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('ID of the updated event.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let event = await client.updateEvent(ctx.input.eventIdOrName, {
      schema: ctx.input.schema
    });

    return {
      output: { eventId: event.id },
      message: `Event \`${event.id}\` updated.`
    };
  })
  .build();

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List Resend events configured for the authenticated team.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      events: z.array(eventOutputSchema).describe('Configured events.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listEvents({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });
    let events = (result.data || []).map(mapEvent);

    return {
      output: {
        events,
        hasMore: result.has_more ?? false
      },
      message: `Found **${events.length}** event(s).`
    };
  })
  .build();

export let deleteEvent = SlateTool.create(spec, {
  name: 'Delete Event',
  key: 'delete_event',
  description: `Delete a Resend event definition.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      eventIdOrName: z.string().describe('Event ID or event name.')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Deleted event ID.'),
      deleted: z.boolean().describe('Whether the event was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteEvent(ctx.input.eventIdOrName);

    return {
      output: {
        eventId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Event \`${result.id}\` has been **deleted**.`
    };
  })
  .build();

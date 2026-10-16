import { SlateTool } from 'slates';
import { z } from 'zod';
import { attendeeSchema, mapAttendee } from '../lib/attendees';
import { Client } from '../lib/client';
import { validateIntegerFields } from '../lib/validation';
import { spec } from '../spec';

export let listAttendees = SlateTool.create(spec, {
  name: 'List Attendees',
  key: 'list_attendees',
  description: `List attendees for a specific event. Returns attendee details including name, email, ticket class, check-in status, and order information. Supports filtering by status and change timestamp.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('The event ID to list attendees for.'),
      status: z
        .string()
        .optional()
        .describe(
          'Filter attendees by provider status: attending, not attending, or unpaid. Check checkedIn in the result for check-in status.'
        ),
      lastItemSeen: z
        .string()
        .optional()
        .describe('With changedSince, return records with a later attendee ID.'),
      attendeeIds: z.array(z.string()).optional().describe('Only return these attendee IDs.'),
      changedSince: z
        .string()
        .optional()
        .describe('Only return attendees changed since this UTC timestamp.'),
      page: z.number().optional().describe('Page number for pagination.'),
      continuation: z
        .string()
        .optional()
        .describe('Continuation token returned by the previous page.')
    })
  )
  .output(
    z.object({
      attendees: z.array(attendeeSchema).describe('List of attendees.'),
      continuation: z.string().optional().describe('Token to retrieve the next page.'),
      hasMore: z.boolean().describe('Whether there are more pages.')
    })
  )
  .handleInvocation(async ctx => {
    validateIntegerFields(ctx.input, ['page'], 1);
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listEventAttendees(ctx.input.eventId, {
      status: ctx.input.status,
      last_item_seen: ctx.input.lastItemSeen,
      attendee_ids: ctx.input.attendeeIds?.join(','),
      changed_since: ctx.input.changedSince,
      continuation: ctx.input.continuation,
      page: ctx.input.page
    });

    let attendees = (result.attendees || []).map(mapAttendee);

    return {
      output: {
        attendees,
        continuation: result.pagination?.continuation ?? undefined,
        hasMore: result.pagination?.has_more_items || false
      },
      message: `Found **${attendees.length}** attendees for event \`${ctx.input.eventId}\`.`
    };
  })
  .build();

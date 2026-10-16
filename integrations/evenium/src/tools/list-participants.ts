import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageMetadata, pageMetadataSchema, participantSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listParticipants = SlateTool.create(spec, {
  name: 'List Participants',
  key: 'list_participants',
  description: `Retrieve the list of participants (guests) for a specific Evenium event. Supports filtering by registration status, name, company, and date range. Use this to view who is registered for an event or to find specific attendees.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('Event ID to list participants for'),
      status: z
        .enum([
          'CONFIRMED',
          'UNANSWERED',
          'CANCELED',
          'DECLINED',
          'RESERVED',
          'OVERBOOKED',
          'EXTRA',
          'VALID',
          'PENDING',
          'DELETED',
          'REPLACED'
        ])
        .optional()
        .describe('Filter by registration status'),
      firstName: z.string().optional().describe('Filter by first name'),
      lastName: z.string().optional().describe('Filter by last name'),
      company: z.string().optional().describe('Filter by company'),
      email: z.string().optional().describe('Filter by exact email address'),
      since: z
        .string()
        .optional()
        .describe('Only return participants modified since this date (RFC 3339 format)'),
      until: z
        .string()
        .optional()
        .describe('Only return participants modified until this date (RFC 3339 format)'),
      firstResult: z.number().optional().describe('Offset for pagination (0-based)'),
      maxResults: z.number().optional().describe('Maximum number of results to return')
    })
  )
  .output(z.object({ participants: z.array(participantSchema), ...pageMetadataSchema }))
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listGuests(ctx.input.eventId, {
      status: ctx.input.status,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      company: ctx.input.company,
      email: ctx.input.email,
      since: ctx.input.since,
      until: ctx.input.until,
      firstResult: ctx.input.firstResult,
      maxResults: ctx.input.maxResults
    });

    let participants = result.guests.map(g => ({
      contactId: g.contactId,
      eventId: g.eventId,
      firstName: g.firstName,
      lastName: g.lastName,
      email: g.email,
      company: g.company,
      gender: g.gender,
      status: g.status,
      lastUpdate: g.lastUpdate,
      categoryLabel: g.categoryLabel,
      raw: g.raw
    }));

    return {
      output: {
        participants,
        ...pageMetadata(result)
      },
      message: `Found **${participants.length}** participant(s) for event \`${ctx.input.eventId}\`.`
    };
  })
  .build();

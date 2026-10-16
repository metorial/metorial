import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { eventIdSchema, pageMetadata, pageMetadataSchema, rawSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listEventParts = SlateTool.create(spec, {
  name: 'List Event Sessions',
  key: 'list_event_parts',
  description:
    'List the sessions or event parts of an event, with dates, location, custom fields, and page continuation data. Call list_events to discover event IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      eventId: eventIdSchema,
      title: z.string().optional().describe('Filter by title'),
      startsAfter: z.string().optional().describe('Start date lower bound (RFC 3339)'),
      startsBefore: z.string().optional().describe('Start date upper bound (RFC 3339)'),
      endsAfter: z.string().optional().describe('End date lower bound (RFC 3339)'),
      endsBefore: z.string().optional().describe('End date upper bound (RFC 3339)'),
      updatedAfter: z.string().optional().describe('Modification date lower bound (RFC 3339)'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Modification date upper bound (RFC 3339)'),
      firstResult: z.number().optional().describe('Page offset, starting at zero'),
      maxResults: z.number().optional().describe('Maximum number of results, default 100')
    })
  )
  .output(
    z.object({
      sessions: z.array(
        z.object({
          id: z.string().describe('Session or event part ID'),
          eventId: z.string().describe('Parent event ID'),
          title: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          lastUpdate: z.string().optional(),
          raw: rawSchema.describe('Complete provider session data')
        })
      ),
      ...pageMetadataSchema
    })
  )
  .handleInvocation(async ctx => {
    let { eventId, ...params } = ctx.input;
    let result = await new Client(ctx.auth.token).listEventParts(eventId, params);
    return {
      output: { sessions: result.items, ...pageMetadata(result) },
      message: `Found **${result.items.length}** session(s).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { driftServiceError } from '../lib/errors';
import { spec } from '../spec';

export let postTimelineEvent = SlateTool.create(spec, {
  name: 'Post Timeline Event',
  key: 'post_timeline_event',
  description: `Post an external activity event to a Drift contact timeline. Provide either a Drift contact ID or an external ID that Drift can match to a contact.`,
  instructions: [
    'Provide contactId for a Drift contact lookup, or externalId for an external identifier lookup.',
    'The event name should include the source system or activity context.'
  ]
})
  .input(
    z.object({
      contactId: z.number().optional().describe('Drift contact ID to post the event to'),
      externalId: z
        .string()
        .optional()
        .describe('External contact identifier to use instead of contactId'),
      event: z.string().describe('Timeline event name'),
      createdAt: z
        .number()
        .optional()
        .describe('Event timestamp in epoch milliseconds. Defaults to Drift receive time.'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional event attributes. Drift stringifies non-string values.')
    })
  )
  .output(
    z.object({
      accepted: z.boolean().describe('Whether Drift accepted the timeline event'),
      contactId: z.number().optional().describe('Contact ID used for the event'),
      externalId: z.string().optional().describe('External ID used for the event'),
      event: z.string().describe('Timeline event name'),
      createdAt: z.number().optional().describe('Event timestamp in epoch milliseconds'),
      timelineEvent: z.any().optional().describe('Raw timeline event returned by Drift')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.contactId && !ctx.input.externalId) {
      throw driftServiceError('contactId or externalId is required to post a timeline event.');
    }

    let client = new DriftClient(ctx.auth.token);
    let timelineEvent = await client.postTimelineEvent({
      contactId: ctx.input.contactId,
      externalId: ctx.input.externalId,
      event: ctx.input.event,
      createdAt: ctx.input.createdAt,
      attributes: ctx.input.attributes
    });

    return {
      output: {
        accepted: true,
        contactId: ctx.input.contactId,
        externalId: ctx.input.externalId,
        event: ctx.input.event,
        createdAt: ctx.input.createdAt,
        timelineEvent
      },
      message: `Posted timeline event **${ctx.input.event}**.`
    };
  })
  .build();

import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireHookdeckInput, requireNonEmptyHookdeckRecord } from '../lib/errors';
import { spec } from '../spec';

export let retryEvents = SlateTool.create(spec, {
  name: 'Retry Events',
  key: 'retry_events',
  description: `Retry, mute, or cancel Hookdeck events. Supports retrying or cancelling a single event by ID, muting an event to cancel automatic retries, or bulk retrying/cancelling events matching a filter query.`,
  instructions: [
    'Use action "retry" with an eventId to retry a single event.',
    'Use action "cancel" with an eventId to remove future delivery attempts for a queued, paused, delayed, or scheduled event.',
    'Use action "mute" to cancel all future automatic retries for an event.',
    'Use action "bulk_retry" or "bulk_cancel" with query filters to operate on multiple events at once. The query must not be empty.'
  ],
  constraints: [
    'Events are limited to 50 automatic retries, but can be manually retried unlimited times.',
    'Bulk retry speed is throttled based on project throughput.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['retry', 'mute', 'cancel', 'bulk_retry', 'bulk_cancel'])
        .describe('Action to perform'),
      eventId: z
        .string()
        .optional()
        .describe('Event ID (required for retry, mute, and cancel)'),
      query: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Non-empty filter query for bulk_retry or bulk_cancel (e.g. { status: "FAILED", source_id: "src_..." })'
        )
    })
  )
  .output(
    z.object({
      eventId: z.string().optional().describe('Event ID that was retried or muted'),
      eventStatus: z.string().optional().describe('Updated event status'),
      bulkRetryId: z.string().optional().describe('Bulk retry batch ID'),
      bulkCancelId: z.string().optional().describe('Bulk cancellation batch ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });

    switch (ctx.input.action) {
      case 'retry': {
        let eventId = requireHookdeckInput(ctx.input.eventId, 'eventId', 'retry');
        let event = await client.retryEvent(eventId);
        return {
          output: { eventId: event.id, eventStatus: event.status },
          message: `Retried event \`${event.id}\`. Status: **${event.status}**.`
        };
      }
      case 'mute': {
        let eventId = requireHookdeckInput(ctx.input.eventId, 'eventId', 'mute');
        let event = await client.muteEvent(eventId);
        return {
          output: { eventId: event.id, eventStatus: event.status },
          message: `Muted event \`${event.id}\`. All future automatic retries have been cancelled.`
        };
      }
      case 'cancel': {
        let eventId = requireHookdeckInput(ctx.input.eventId, 'eventId', 'cancel');
        let event = await client.cancelEvent(eventId);
        return {
          output: { eventId: event.id, eventStatus: event.status },
          message: `Cancelled event \`${event.id}\`. Future delivery attempts have been removed.`
        };
      }
      case 'bulk_retry': {
        let query = requireNonEmptyHookdeckRecord(ctx.input.query, 'query', 'bulk_retry');
        let result = await client.bulkRetryEvents(query);
        return {
          output: { bulkRetryId: result.id },
          message: `Initiated bulk retry batch \`${result.id}\`.`
        };
      }
      case 'bulk_cancel': {
        let query = requireNonEmptyHookdeckRecord(ctx.input.query, 'query', 'bulk_cancel');
        let result = await client.bulkCancelEvents(query);
        return {
          output: { bulkCancelId: result.id },
          message: `Initiated bulk cancellation batch \`${result.id}\`.`
        };
      }
    }
  })
  .build();

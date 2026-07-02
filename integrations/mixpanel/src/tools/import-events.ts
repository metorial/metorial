import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  createClientFromContext,
  requireNonEmptyStringArray,
  requireServiceAccount
} from '../lib/helpers';
import { spec } from '../spec';

export let importEvents = SlateTool.create(spec, {
  name: 'Import Events',
  key: 'import_events',
  description: `Send a batch of events to Mixpanel. Supports historical events older than 5 days (use Track Events for recent real-time events).
Each event requires an event name, a distinct user ID, a Unix timestamp, and an optional insert ID for deduplication.
Up to **2000 events** per request.`,
  instructions: [
    'Use $insert_id in properties to enable deduplication of events.',
    'Time must be a Unix timestamp in seconds.'
  ],
  constraints: [
    'Maximum of 2000 events per batch.',
    'Maximum payload size of 10MB uncompressed.',
    'Requires Service Account authentication.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      events: z
        .array(
          z.object({
            eventName: z.string().describe('Name of the event'),
            distinctId: z.string().describe('Unique identifier for the user'),
            time: z.number().describe('Unix timestamp in seconds when the event occurred'),
            insertId: z.string().describe('Unique ID for deduplication'),
            properties: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Additional custom properties for the event')
          })
        )
        .describe('Array of events to import')
    })
  )
  .output(
    z.object({
      numRecordsImported: z.number().describe('Number of events successfully imported'),
      status: z.string().describe('Status of the import operation'),
      failedRecords: z
        .array(
          z.object({
            index: z.number().describe('Index of the failed event in the batch'),
            insertId: z.string().optional().describe('Insert ID of the failed event'),
            field: z.string().optional().describe('Field that caused the failure'),
            message: z.string().describe('Error message')
          })
        )
        .optional()
        .describe('Details of any failed events')
    })
  )
  .handleInvocation(async ctx => {
    requireServiceAccount(ctx);
    requireNonEmptyStringArray(
      ctx.input.events.map(event => event.eventName),
      'events'
    );

    let client = createClientFromContext(ctx);

    let events = ctx.input.events.map(e => ({
      event: e.eventName,
      properties: {
        distinct_id: e.distinctId,
        time: e.time,
        ...(e.insertId ? { $insert_id: e.insertId } : {}),
        ...(e.properties ?? {})
      }
    }));

    let result = await client.importEvents(events);

    return {
      output: {
        numRecordsImported: result.numRecordsImported,
        status: result.status,
        failedRecords: result.failedRecords
      },
      message: `Imported **${result.numRecordsImported}** events successfully.${result.failedRecords?.length ? ` ${result.failedRecords.length} events failed.` : ''}`
    };
  })
  .build();

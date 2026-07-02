import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recordEvents = SlateTool.create(spec, {
  name: 'Record Events',
  key: 'record_events',
  description: `Record one or more custom events into Keen.io event collections. Supports recording a single event to one collection or batch-uploading multiple events across multiple collections. Event collections are created automatically on the first write. Events can include **data enrichment add-ons** (IP-to-Geo, User Agent Parser, URL Parser, Referrer Parser, Datetime Parser) by including directives in the \`keen\` namespace of the event payload.`,
  instructions: [
    'To use data enrichments, include a "keen" property in the event with an "addons" array specifying the enrichment configurations.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      collectionName: z
        .string()
        .optional()
        .describe('Name of the event collection. Required when recording a single event.'),
      event: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'A single event object to record. Use this for recording one event to a single collection.'
        ),
      batchEvents: z
        .record(z.string(), z.array(z.record(z.string(), z.any())))
        .optional()
        .describe(
          'A map of collection names to arrays of events for batch recording across multiple collections. Each key is a collection name and each value is an array of event objects.'
        )
    })
  )
  .output(
    z.object({
      created: z.boolean().describe('Whether the event(s) were successfully created'),
      results: z
        .any()
        .optional()
        .describe('Detailed results for batch operations, keyed by collection name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      projectId: ctx.config.projectId,
      token: ctx.auth.token
    });

    if (ctx.input.batchEvents) {
      let result = await client.recordMultipleEvents(ctx.input.batchEvents);
      let collectionNames = Object.keys(ctx.input.batchEvents);
      let totalEvents = Object.values(ctx.input.batchEvents).reduce(
        (sum, arr) => sum + arr.length,
        0
      );
      return {
        output: {
          created: true,
          results: result
        },
        message: `Batch recorded **${totalEvents}** events across **${collectionNames.length}** collection(s): ${collectionNames.join(', ')}.`
      };
    }

    if (ctx.input.collectionName && ctx.input.event) {
      let result = await client.recordEvent(ctx.input.collectionName, ctx.input.event);
      return {
        output: {
          created: true,
          results: result
        },
        message: `Recorded 1 event to collection **${ctx.input.collectionName}**.`
      };
    }

    throw new Error(
      'Either provide "collectionName" + "event" for a single event, or "batchEvents" for batch recording.'
    );
  });

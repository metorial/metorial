import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSplunkClient } from '../lib/helpers';
import { spec } from '../spec';

export let sendHecEvent = SlateTool.create(spec, {
  name: 'Send HEC Event',
  key: 'send_hec_event',
  description: `Send one or more events to Splunk via the HTTP Event Collector (HEC). Supports JSON-formatted events with optional metadata (host, source, sourcetype, index, timestamp). Requires an HEC token configured in authentication settings.`,
  instructions: [
    'An HEC token must be configured in the authentication settings.',
    'Each event must have an "event" field containing the event data (string or object).',
    'The "time" field accepts epoch timestamps in seconds.'
  ],
  constraints: [
    'HEC must be enabled on the Splunk instance.',
    'The HEC token must be valid and associated with an allowed index.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      events: z
        .array(
          z.object({
            event: z.any().describe('Event data (string or JSON object)'),
            time: z.number().optional().describe('Event timestamp as epoch seconds'),
            host: z.string().optional().describe('Override host metadata'),
            source: z.string().optional().describe('Override source metadata'),
            sourcetype: z.string().optional().describe('Override sourcetype metadata'),
            index: z.string().optional().describe('Target index for the event')
          })
        )
        .min(1)
        .describe('Array of events to send')
    })
  )
  .output(
    z.object({
      text: z.string().describe('Response status text'),
      code: z.number().describe('Response status code (0 = success)'),
      eventCount: z.number().describe('Number of events sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);

    let response: { text: string; code: number };
    if (ctx.input.events.length === 1) {
      response = await client.sendHecEvent(ctx.input.events[0]!);
    } else {
      response = await client.sendHecEvents(ctx.input.events);
    }

    return {
      output: {
        ...response,
        eventCount: ctx.input.events.length
      },
      message: `Sent **${ctx.input.events.length}** event(s) to Splunk HEC. Status: **${response.text}**.`
    };
  })
  .build();

export let sendHecRawEvent = SlateTool.create(spec, {
  name: 'Send HEC Raw Event',
  key: 'send_hec_raw_event',
  description: `Send raw text data to Splunk via the HTTP Event Collector (HEC) raw endpoint. Use this for unstructured log data that Splunk should parse using its normal data processing pipeline.`,
  instructions: [
    'An HEC token must be configured in the authentication settings.',
    'Raw events require a channel identifier (GUID) for the X-Splunk-Request-Channel header.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      rawData: z.string().describe('Raw text data to send'),
      host: z.string().optional().describe('Override host metadata'),
      source: z.string().optional().describe('Override source metadata'),
      sourcetype: z.string().optional().describe('Override sourcetype metadata'),
      index: z.string().optional().describe('Target index'),
      channel: z
        .string()
        .optional()
        .describe('Request channel GUID (required for raw endpoint)')
    })
  )
  .output(
    z.object({
      text: z.string().describe('Response status text'),
      code: z.number().describe('Response status code (0 = success)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    let response = await client.sendHecRaw(ctx.input.rawData, {
      host: ctx.input.host,
      source: ctx.input.source,
      sourcetype: ctx.input.sourcetype,
      index: ctx.input.index,
      channel: ctx.input.channel
    });

    return {
      output: response,
      message: `Raw event sent to Splunk HEC. Status: **${response.text}**.`
    };
  })
  .build();

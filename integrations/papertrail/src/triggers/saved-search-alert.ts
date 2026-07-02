import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let alertEventSchema = z.object({
  eventId: z.string().describe('Unique Papertrail event ID'),
  receivedAt: z.string().describe('ISO 8601 timestamp when the event was received'),
  displayReceivedAt: z.string().describe('Human-readable received timestamp'),
  sourceId: z.number().describe('ID of the source system'),
  sourceName: z.string().describe('Name of the source system'),
  sourceIp: z.string().describe('IP address of the source system'),
  facility: z.string().describe('Syslog facility'),
  severity: z.string().describe('Syslog severity level'),
  hostname: z.string().describe('Hostname of the sender'),
  program: z.string().describe('Program or application name'),
  message: z.string().describe('Log message content')
});

let alertCountSchema = z.object({
  sourceName: z.string().describe('Name of the sending system'),
  sourceId: z.number().describe('ID of the sending system'),
  timeseries: z
    .record(z.string(), z.number())
    .describe('Map of Unix timestamps to event counts')
});

export let savedSearchAlert = SlateTrigger.create(spec, {
  name: 'Saved Search Alert',
  key: 'saved_search_alert',
  description:
    'Triggers when a saved search alert fires, delivering matching log events or count summaries via webhook.'
})
  .input(
    z.object({
      savedSearchId: z.number().describe('ID of the saved search that triggered the alert'),
      savedSearchName: z.string().describe('Name of the saved search'),
      countsOnly: z.boolean().describe('Whether this is a count-only alert'),
      events: z
        .array(alertEventSchema)
        .optional()
        .describe('Matching log events (when not count-only)'),
      counts: z
        .array(alertCountSchema)
        .optional()
        .describe('Count summaries by source (when count-only)'),
      minId: z.string().optional().describe('Minimum event ID in this batch'),
      maxId: z.string().optional().describe('Maximum event ID in this batch')
    })
  )
  .output(
    z.object({
      savedSearchId: z.number().describe('ID of the saved search that triggered the alert'),
      savedSearchName: z.string().describe('Name of the saved search'),
      eventCount: z.number().describe('Number of matching events'),
      events: z
        .array(alertEventSchema)
        .optional()
        .describe('Matching log events (when not count-only)'),
      counts: z
        .array(alertCountSchema)
        .optional()
        .describe('Count summaries by source (when count-only)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: string;
      let contentType = ctx.request.headers.get('content-type') || '';

      let payloadStr: string;

      if (contentType.includes('application/json')) {
        let json = (await ctx.request.json()) as any;
        payloadStr = typeof json.payload === 'string' ? json.payload : JSON.stringify(json);
      } else {
        body = await ctx.request.text();
        // application/x-www-form-urlencoded: payload=<url-encoded JSON>
        let params = new URLSearchParams(body);
        payloadStr = params.get('payload') || body;
      }

      let payload: any;
      try {
        payload = typeof payloadStr === 'string' ? JSON.parse(payloadStr) : payloadStr;
      } catch {
        payload = payloadStr;
      }

      let savedSearch = payload.saved_search || {};
      let countsOnly = !payload.events && !!payload.counts;

      let events = (payload.events || []).map((e: any) => ({
        eventId: String(e.id),
        receivedAt: e.received_at || '',
        displayReceivedAt: e.display_received_at || '',
        sourceId: e.source_id || 0,
        sourceName: e.source_name || '',
        sourceIp: e.source_ip || '',
        facility: e.facility || '',
        severity: e.severity || '',
        hostname: e.hostname || '',
        program: e.program || '',
        message: e.message || ''
      }));

      let counts = (payload.counts || []).map((c: any) => ({
        sourceName: c.source_name || '',
        sourceId: c.source_id || 0,
        timeseries: c.timeseries || {}
      }));

      return {
        inputs: [
          {
            savedSearchId: savedSearch.id || 0,
            savedSearchName: savedSearch.name || '',
            countsOnly,
            events: countsOnly ? undefined : events,
            counts: countsOnly ? counts : undefined,
            minId: payload.min_id ? String(payload.min_id) : undefined,
            maxId: payload.max_id ? String(payload.max_id) : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventCount = ctx.input.countsOnly
        ? (ctx.input.counts || []).reduce((sum, c) => {
            let total = Object.values(c.timeseries).reduce((a, b) => a + b, 0);
            return sum + total;
          }, 0)
        : (ctx.input.events || []).length;

      let uniqueId = `${ctx.input.savedSearchId}-${ctx.input.maxId || ctx.input.minId || Date.now()}`;

      return {
        type: 'saved_search.alert',
        id: uniqueId,
        output: {
          savedSearchId: ctx.input.savedSearchId,
          savedSearchName: ctx.input.savedSearchName,
          eventCount,
          events: ctx.input.events,
          counts: ctx.input.counts
        }
      };
    }
  })
  .build();

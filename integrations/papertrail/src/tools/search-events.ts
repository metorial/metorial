import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let logEventSchema = z.object({
  eventId: z.string().describe('Unique Papertrail event ID'),
  generatedAt: z.string().describe('ISO 8601 timestamp when the log event was generated'),
  receivedAt: z.string().describe('ISO 8601 timestamp when Papertrail received the event'),
  displayReceivedAt: z.string().describe('Human-readable received timestamp'),
  sourceId: z.number().describe('ID of the system that generated the event'),
  sourceName: z.string().describe('Name of the system that generated the event'),
  sourceIp: z.string().describe('IP address of the source system'),
  facility: z.string().describe('Syslog facility name'),
  severity: z.string().describe('Syslog severity level'),
  hostname: z.string().describe('Hostname of the sender'),
  program: z.string().describe('Program or application name'),
  message: z.string().describe('Log message content')
});

export let searchEvents = SlateTool.create(spec, {
  name: 'Search Log Events',
  key: 'search_events',
  description: `Search for log events across systems and groups. Supports Papertrail's full query syntax including Boolean operators (AND, OR), negation, quoted phrases, and attribute filters like \`sender:\` and \`program:\`. Results can be filtered by system, group, and time range.`,
  instructions: [
    'Use Unix timestamps (seconds since epoch) for minTime and maxTime parameters.',
    'For pagination, use the minId or maxId from the previous response to fetch the next set of results.',
    'Query syntax supports: AND, OR, quoted phrases, negation with -, and attribute filters like sender:hostname or program:nginx.'
  ],
  constraints: [
    'Maximum limit is 10,000 events per request (default 1,000).',
    'Rate limited to 25 requests per 5-second window.',
    'Per-request time limit of approximately 5 seconds; partial results may be returned.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search query string using Papertrail search syntax'),
      systemId: z.number().optional().describe('Limit results to a specific system by ID'),
      groupId: z.number().optional().describe('Limit results to a specific group by ID'),
      minTime: z
        .number()
        .optional()
        .describe('Earliest timestamp (Unix epoch seconds) to include'),
      maxTime: z
        .number()
        .optional()
        .describe('Latest timestamp (Unix epoch seconds) to include'),
      minId: z
        .string()
        .optional()
        .describe('Return events after this event ID (for pagination)'),
      maxId: z
        .string()
        .optional()
        .describe('Return events before this event ID (for pagination)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of events to return (default 1000, max 10000)'),
      tail: z
        .boolean()
        .optional()
        .describe('Enable live tail mode to prioritize recency over completeness')
    })
  )
  .output(
    z.object({
      events: z.array(logEventSchema).describe('Array of matching log events'),
      minId: z
        .string()
        .optional()
        .describe('Smallest event ID in the result set, for backward pagination'),
      maxId: z
        .string()
        .optional()
        .describe('Largest event ID in the result set, for forward pagination'),
      reachedTimeLimit: z
        .boolean()
        .optional()
        .describe(
          'Whether the search time limit was reached before all results were returned'
        ),
      minTimeAt: z
        .string()
        .optional()
        .describe('Oldest timestamp searched during the request'),
      maxTimeAt: z.string().optional().describe('Newest timestamp searched during the request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchEvents({
      query: ctx.input.query,
      systemId: ctx.input.systemId,
      groupId: ctx.input.groupId,
      minTime: ctx.input.minTime,
      maxTime: ctx.input.maxTime,
      minId: ctx.input.minId,
      maxId: ctx.input.maxId,
      limit: ctx.input.limit,
      tail: ctx.input.tail
    });

    let events = (result.events || []).map((e: any) => ({
      eventId: String(e.id),
      generatedAt: e.generated_at || '',
      receivedAt: e.received_at || '',
      displayReceivedAt: e.display_received_at || '',
      sourceId: e.source_id,
      sourceName: e.source_name || '',
      sourceIp: e.source_ip || '',
      facility: e.facility || '',
      severity: e.severity || '',
      hostname: e.hostname || '',
      program: e.program || '',
      message: e.message || ''
    }));

    return {
      output: {
        events,
        minId: result.min_id ? String(result.min_id) : undefined,
        maxId: result.max_id ? String(result.max_id) : undefined,
        reachedTimeLimit: result.reached_time_limit,
        minTimeAt: result.min_time_at,
        maxTimeAt: result.max_time_at
      },
      message: `Found **${events.length}** log event(s)${ctx.input.query ? ` matching query "${ctx.input.query}"` : ''}.${result.reached_time_limit ? ' ⚠️ Time limit reached — partial results returned.' : ''}`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  createClient,
  jsonByteLength,
  takeWithinOutputBudget,
  truncateText
} from '../lib/helpers';
import { spec } from '../spec';

let MAX_LOG_MESSAGE_CHARS = 20_000;
let MAX_LOG_ATTRIBUTES_BYTES = 50_000;

let mapLogs = (data: any[]) =>
  data.map((log: any) => {
    let message = truncateText(log.attributes?.message, MAX_LOG_MESSAGE_CHARS);
    let attributes = log.attributes?.attributes;
    let attributesOmitted =
      attributes !== undefined &&
      attributes !== null &&
      jsonByteLength(attributes) > MAX_LOG_ATTRIBUTES_BYTES;

    return {
      logId: log.id,
      timestamp: log.attributes?.timestamp,
      host: log.attributes?.host,
      service: log.attributes?.service,
      status: log.attributes?.status,
      message: message.value,
      tags: log.attributes?.tags,
      attributes: attributesOmitted ? undefined : (attributes ?? undefined),
      truncated: message.truncated || attributesOmitted ? true : undefined
    };
  });

export let searchLogs = SlateTool.create(spec, {
  name: 'Search Logs',
  key: 'search_logs',
  description: `Search and retrieve logs from Datadog using query syntax. Filter logs by time range, service, status, and custom attributes.
Uses the Datadog log search query language, e.g. \`service:my-service status:error\`.`,
  instructions: [
    'Use Datadog log query syntax for filtering, e.g. "service:web status:error".',
    'Time range is specified as ISO 8601 timestamps.',
    'Use cursor for pagination when there are more results.',
    'Very long log messages are shortened and very large custom attribute sets are omitted; such logs are marked truncated. Pages that would be too large are returned with fewer logs, and nextCursor continues after the last returned log.'
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
        .describe('Log search query, e.g. "service:web status:error". Defaults to "*"'),
      from: z.string().describe('Start time as ISO 8601 string, e.g. "2024-01-01T00:00:00Z"'),
      to: z.string().describe('End time as ISO 8601 string, e.g. "2024-01-02T00:00:00Z"'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of logs to return (default 50, max 1000)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      sort: z
        .enum(['timestamp', '-timestamp'])
        .optional()
        .describe('Sort order: "timestamp" (ascending) or "-timestamp" (descending)'),
      indexes: z
        .array(z.string())
        .optional()
        .describe('Log indexes to search. Defaults to all indexes.')
    })
  )
  .output(
    z.object({
      logs: z
        .array(
          z.object({
            logId: z.string().optional(),
            timestamp: z.string().optional(),
            host: z.string().optional(),
            service: z.string().optional(),
            status: z.string().optional(),
            message: z.string().optional(),
            tags: z.array(z.string()).optional(),
            attributes: z.any().optional(),
            truncated: z
              .boolean()
              .optional()
              .describe(
                'True when the message was shortened or custom attributes were omitted because they were too large'
              )
          })
        )
        .describe('List of log entries'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results'),
      pageReduced: z
        .boolean()
        .optional()
        .describe(
          'True when fewer logs than requested were returned to keep the response size manageable; continue with nextCursor'
        ),
      truncated: z
        .boolean()
        .optional()
        .describe(
          'True when at least one log had its message shortened or custom attributes omitted'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.searchLogs(ctx.input);
    let logs = mapLogs(result.data || []);
    let nextCursor: string | undefined = result.meta?.page?.after;
    let pageReduced = false;

    let fitted = takeWithinOutputBudget(logs);
    if (fitted.truncated) {
      // Request a smaller page so the returned cursor continues right after the last returned log.
      let smaller = await client.searchLogs({ ...ctx.input, limit: fitted.items.length });
      // Return the smaller page as-is: dropping logs here would skip them, since nextCursor
      // continues after the last log of this page. Per-log caps keep it well under the limit.
      logs = mapLogs(smaller.data || []);
      nextCursor = smaller.meta?.page?.after;
      pageReduced = true;
    }

    let contentTruncated = logs.some(log => log.truncated);

    return {
      output: {
        logs,
        nextCursor,
        pageReduced: pageReduced || undefined,
        truncated: contentTruncated || undefined
      },
      message: `Found **${logs.length}** log entries${nextCursor ? ' (more available)' : ''}${
        pageReduced
          ? '. The page was reduced to keep the response size manageable; use nextCursor to continue.'
          : ''
      }${
        contentTruncated
          ? ' Some log messages were shortened or custom attributes omitted because they were too large.'
          : ''
      }`
    };
  })
  .build();

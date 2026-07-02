import { SlateTool } from 'slates';
import { z } from 'zod';
import * as logging from '../lib/logging';
import { spec } from '../spec';

export let readLogs = SlateTool.create(spec, {
  name: 'Read Logs',
  key: 'read_logs',
  description: `Read log entries from a Yandex Cloud Logging log group. Filter by resource type, resource ID, severity level, and time range.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      logGroupId: z.string().describe('Log group ID to read from'),
      resourceTypes: z.array(z.string()).optional().describe('Filter by resource types'),
      resourceIds: z.array(z.string()).optional().describe('Filter by resource IDs'),
      levels: z
        .array(z.enum(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']))
        .optional()
        .describe('Filter by log levels'),
      since: z.string().optional().describe('Start timestamp (RFC 3339 format)'),
      until: z.string().optional().describe('End timestamp (RFC 3339 format)'),
      pageSize: z.number().optional().describe('Maximum number of entries'),
      pageToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      entries: z.any().describe('Log entries'),
      nextPageToken: z.string().optional().describe('Next page token')
    })
  )
  .handleInvocation(async ctx => {
    let result = await logging.readLogs(ctx.auth, {
      logGroupId: ctx.input.logGroupId,
      resourceTypes: ctx.input.resourceTypes,
      resourceIds: ctx.input.resourceIds,
      levels: ctx.input.levels,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken,
      since: ctx.input.since,
      until: ctx.input.until
    });

    return {
      output: {
        entries: result.entries || [],
        nextPageToken: result.nextPageToken
      },
      message: `Retrieved log entries from group ${ctx.input.logGroupId}.`
    };
  })
  .build();

export let writeLogs = SlateTool.create(spec, {
  name: 'Write Logs',
  key: 'write_logs',
  description: `Write log entries to a Yandex Cloud Logging log group or directly to a folder's default log group. Supports structured JSON payloads.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      logGroupId: z.string().optional().describe('Log group ID to write to'),
      folderId: z
        .string()
        .optional()
        .describe('Folder ID (uses default log group if logGroupId not specified)'),
      entries: z
        .array(
          z.object({
            timestamp: z.string().describe('Entry timestamp in RFC 3339 format'),
            level: z
              .enum(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'])
              .optional()
              .describe('Log level'),
            message: z.string().describe('Log message'),
            jsonPayload: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Structured data payload')
          })
        )
        .describe('Log entries to write')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the write was successful')
    })
  )
  .handleInvocation(async ctx => {
    let folderId = ctx.input.folderId || ctx.config.folderId;

    await logging.writeLogs(ctx.auth, {
      logGroupId: ctx.input.logGroupId,
      folderId: !ctx.input.logGroupId ? folderId : undefined,
      entries: ctx.input.entries
    });

    return {
      output: { success: true },
      message: `Wrote ${ctx.input.entries.length} log entry(ies).`
    };
  })
  .build();

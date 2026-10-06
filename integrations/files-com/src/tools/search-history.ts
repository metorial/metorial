import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { optionalText, text } from '../lib/contracts';
import { spec } from '../spec';

export let searchHistory = SlateTool.create(spec, {
  name: 'Search History',
  key: 'search_history',
  description: `Search the audit log for file operations and user activity. Filter by path, folder, user, date range, and more. Returns detailed records of actions including uploads, downloads, deletes, moves, copies, and account events.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      path: z.string().optional().describe('Filter by exact file path'),
      folder: z.string().optional().describe('Filter by folder path'),
      userId: z.number().optional().describe('Filter by user ID'),
      username: z.string().optional().describe('Filter by username'),
      startAt: z.string().optional().describe('Show events after this date/time (ISO 8601)'),
      endAt: z.string().optional().describe('Show events before this date/time (ISO 8601)'),
      cursor: z.string().optional().describe('Pagination cursor'),
      perPage: z.number().optional().describe('Results per page (default 100)')
    })
  )
  .output(
    z.object({
      logs: z
        .array(
          z.object({
            action: z
              .string()
              .describe('Action type (create, read, update, delete, move, copy, etc.)'),
            path: z.string().optional().describe('File/folder path'),
            folder: z.string().optional().describe('Containing folder'),
            source: z.string().optional().describe('Source path (for move/copy)'),
            destination: z.string().optional().describe('Destination path (for move/copy)'),
            username: z.string().optional().describe('User who performed the action'),
            userId: z.number().optional().describe('User ID'),
            interface: z
              .string()
              .optional()
              .describe('Interface used (web, api, ftp, sftp, dav, etc.)'),
            ip: z.string().optional().describe('Source IP address'),
            createdAt: z.string().optional().describe('When the action occurred'),
            failureType: z.string().optional().describe('Failure type if action failed')
          })
        )
        .describe('Action log entries'),
      nextCursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let result = await client.listActionLogs({
      path: ctx.input.path,
      folder: ctx.input.folder,
      userId: ctx.input.userId,
      username: ctx.input.username,
      startAt: ctx.input.startAt,
      endAt: ctx.input.endAt,
      cursor: ctx.input.cursor,
      perPage: ctx.input.perPage
    });

    let logs = result.logs.map((log: Record<string, unknown>) => ({
      action: text(log.action),
      path: optionalText(log.path),
      folder: optionalText(log.folder),
      source: optionalText(log.source),
      destination: optionalText(log.destination),
      username: optionalText(log.username),
      userId: typeof log.user_id === 'number' ? log.user_id : undefined,
      interface: optionalText(log.interface),
      ip: optionalText(log.ip),
      createdAt: optionalText(log.when),
      failureType: optionalText(log.failure_type)
    }));

    return {
      output: { logs, nextCursor: result.cursor },
      message: `Found **${logs.length}** log entries${result.cursor ? '. More results available.' : '.'}`
    };
  })
  .build();

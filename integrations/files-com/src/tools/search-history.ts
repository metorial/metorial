import { SlateTool } from 'slates';
import { z } from 'zod';
import { FilesComClient } from '../lib/client';
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
    let client = new FilesComClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

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
      action: String(log.action ?? ''),
      path: log.path ? String(log.path) : undefined,
      folder: log.folder ? String(log.folder) : undefined,
      source: log.src ? String(log.src) : undefined,
      destination: log.destination ? String(log.destination) : undefined,
      username: log.username ? String(log.username) : undefined,
      userId: typeof log.user_id === 'number' ? log.user_id : undefined,
      interface: log.interface ? String(log.interface) : undefined,
      ip: log.ip ? String(log.ip) : undefined,
      createdAt: log.created_at ? String(log.created_at) : undefined,
      failureType: log.failure_type ? String(log.failure_type) : undefined
    }));

    return {
      output: { logs, nextCursor: result.cursor },
      message: `Found **${logs.length}** log entries${result.cursor ? '. More results available.' : '.'}`
    };
  })
  .build();

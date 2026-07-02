import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { spec } from '../spec';

export let fileActivityTrigger = SlateTrigger.create(spec, {
  name: 'File Activity',
  key: 'file_activity',
  description:
    '[Polling fallback] Polls the Egnyte Events API (v2) for file system, comment, and permission change events. Captures file additions, deletions, moves, copies, and permission changes. Uses cursor-based pagination for efficient incremental polling.',
  constraints: [
    'Events are available for the last 7 days only',
    'Polling interval should be 5 minutes or more per Egnyte guidelines'
  ]
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of event (e.g. "file_system", "note", "permission_change")'),
      eventId: z.string().describe('Unique event identifier'),
      action: z
        .string()
        .optional()
        .describe('Specific action (e.g. "create", "delete", "move")'),
      path: z.string().optional().describe('Path of the affected file or folder'),
      targetPath: z.string().optional().describe('Destination path for move/copy'),
      userId: z.number().optional().describe('User ID who performed the action'),
      username: z.string().optional().describe('Username who performed the action'),
      timestamp: z.string().optional().describe('Event timestamp'),
      groupId: z.string().optional().describe('File group ID'),
      folderId: z.string().optional().describe('Folder ID'),
      rawEvent: z.record(z.string(), z.unknown()).optional().describe('Full raw event')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Event type'),
      action: z.string().optional().describe('Specific action performed'),
      path: z.string().optional().describe('Path of the affected resource'),
      targetPath: z.string().optional().describe('Destination path for move/copy'),
      userId: z.number().optional().describe('User who performed the action'),
      username: z.string().optional().describe('Username'),
      timestamp: z.string().optional().describe('When the event occurred'),
      groupId: z.string().optional().describe('File group ID'),
      folderId: z.string().optional().describe('Folder ID')
    })
  )
  .polling({
    options: {
      intervalInSeconds: Math.max(SlateDefaultPollingIntervalSeconds, 300) // At least 5 minutes per Egnyte guidelines
    },

    pollEvents: async ctx => {
      let client = new EgnyteClient({
        token: ctx.auth.token,
        domain: ctx.auth.domain
      });

      let cursor = ctx.state?.cursor as string | number | undefined;
      let result: Record<string, unknown>;

      try {
        result = (await client.getEvents(cursor)) as Record<string, unknown>;
      } catch (e: unknown) {
        // 204 means no events; return empty
        let err = e as Record<string, unknown>;
        if (err.response && (err.response as Record<string, unknown>).status === 204) {
          return { inputs: [], updatedState: { cursor } };
        }
        throw e;
      }

      let events = Array.isArray(result.events) ? result.events : [];
      let latestCursor = result.latest_event_id || result.oldest_event_id || cursor;

      let inputs = events.map((event: Record<string, unknown>) => {
        let data = (event.data || event) as Record<string, unknown>;
        return {
          eventType: String(event.type || 'unknown'),
          eventId: String(event.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
          action: data.action ? String(data.action) : undefined,
          path: data.path ? String(data.path) : undefined,
          targetPath: data.target_path ? String(data.target_path) : undefined,
          userId: typeof data.user_id === 'number' ? data.user_id : undefined,
          username: data.username ? String(data.username) : undefined,
          timestamp: event.timestamp ? String(event.timestamp) : undefined,
          groupId: data.group_id ? String(data.group_id) : undefined,
          folderId: data.folder_id ? String(data.folder_id) : undefined,
          rawEvent: event
        };
      });

      return {
        inputs,
        updatedState: {
          cursor: latestCursor
        }
      };
    },

    handleEvent: async ctx => {
      let baseType = ctx.input.eventType.replace(/_/g, '.');
      let type = ctx.input.action ? `${baseType}.${ctx.input.action}` : baseType;

      return {
        type,
        id: ctx.input.eventId,
        output: {
          eventType: ctx.input.eventType,
          action: ctx.input.action,
          path: ctx.input.path,
          targetPath: ctx.input.targetPath,
          userId: ctx.input.userId,
          username: ctx.input.username,
          timestamp: ctx.input.timestamp,
          groupId: ctx.input.groupId,
          folderId: ctx.input.folderId
        }
      };
    }
  })
  .build();

import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FilesComClient } from '../lib/client';
import { spec } from '../spec';

export let actionLog = SlateTrigger.create(spec, {
  name: 'Action Log',
  key: 'action_log',
  description:
    '[Polling fallback] Polls the Files.com action log for new activity. Triggers on file operations, user actions, and other auditable events. Useful for monitoring activity without configuring webhooks.'
})
  .input(
    z.object({
      action: z.string().describe('Action type performed'),
      path: z.string().optional().describe('File/folder path'),
      folder: z.string().optional().describe('Containing folder'),
      source: z.string().optional().describe('Source path for move/copy'),
      destination: z.string().optional().describe('Destination path for move/copy'),
      username: z.string().optional().describe('User who performed the action'),
      userId: z.number().optional().describe('User ID'),
      interface: z.string().optional().describe('Interface used'),
      ip: z.string().optional().describe('Source IP address'),
      createdAt: z.string().describe('When the action occurred'),
      failureType: z.string().optional().describe('Failure type if action failed')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Action type performed'),
      path: z.string().optional().describe('File/folder path'),
      folder: z.string().optional().describe('Containing folder'),
      source: z.string().optional().describe('Source path for move/copy'),
      destination: z.string().optional().describe('Destination path for move/copy'),
      username: z.string().optional().describe('User who performed the action'),
      userId: z.number().optional().describe('User ID'),
      interface: z.string().optional().describe('Interface used'),
      ip: z.string().optional().describe('Source IP address'),
      createdAt: z.string().optional().describe('When the action occurred'),
      failureType: z.string().optional().describe('Failure type if action failed')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FilesComClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      let state = ctx.state as { lastPollTime?: string } | undefined;
      let lastPollTime =
        state?.lastPollTime ?? new Date(Date.now() - 5 * 60 * 1000).toISOString();

      let result = await client.listActionLogs({
        startAt: lastPollTime,
        perPage: 100
      });

      let inputs = result.logs.map((log: Record<string, unknown>) => ({
        action: String(log.action ?? ''),
        path: log.path ? String(log.path) : undefined,
        folder: log.folder ? String(log.folder) : undefined,
        source: log.src ? String(log.src) : undefined,
        destination: log.destination ? String(log.destination) : undefined,
        username: log.username ? String(log.username) : undefined,
        userId: typeof log.user_id === 'number' ? log.user_id : undefined,
        interface: log.interface ? String(log.interface) : undefined,
        ip: log.ip ? String(log.ip) : undefined,
        createdAt: String(log.created_at ?? new Date().toISOString()),
        failureType: log.failure_type ? String(log.failure_type) : undefined
      }));

      let newLastPollTime = lastPollTime;
      if (inputs.length > 0) {
        let timestamps = inputs
          .map((i: { createdAt: string }) => i.createdAt)
          .filter(Boolean)
          .sort();
        let latest = timestamps[timestamps.length - 1];
        if (latest && latest > lastPollTime) {
          newLastPollTime = latest;
        }
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: newLastPollTime
        }
      };
    },

    handleEvent: async ctx => {
      let { action, path, createdAt } = ctx.input;
      let eventId = `${action}-${path ?? 'unknown'}-${createdAt}`;

      let actionTypeMap: Record<string, string> = {
        create: 'action.file_created',
        read: 'action.file_read',
        update: 'action.file_updated',
        delete: 'action.file_deleted',
        destroy: 'action.file_deleted',
        move: 'action.file_moved',
        copy: 'action.file_copied'
      };

      let eventType = actionTypeMap[action] ?? `action.${action}`;

      return {
        type: eventType,
        id: eventId,
        output: {
          action: ctx.input.action,
          path: ctx.input.path,
          folder: ctx.input.folder,
          source: ctx.input.source,
          destination: ctx.input.destination,
          username: ctx.input.username,
          userId: ctx.input.userId,
          interface: ctx.input.interface,
          ip: ctx.input.ip,
          createdAt: ctx.input.createdAt,
          failureType: ctx.input.failureType
        }
      };
    }
  })
  .build();

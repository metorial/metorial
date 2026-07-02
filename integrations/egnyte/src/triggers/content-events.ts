import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { spec } from '../spec';

export let contentEventsTrigger = SlateTrigger.create(spec, {
  name: 'Content Events',
  key: 'content_events',
  description:
    'Triggered when files, folders, links, comments, metadata, permissions, workflows, or groups change in Egnyte. Supports filtering by event type and folder path via webhook registration. Covers file system operations, link lifecycle, comment activity, metadata changes, permission updates, workflow progress, and group management.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The event type (e.g. "fs:add_file", "link:create", "permission:permission_change")'
        ),
      webhookId: z.string().optional().describe('Webhook ID that triggered this event'),
      timestamp: z.string().optional().describe('When the event occurred'),
      actionSource: z
        .string()
        .optional()
        .describe('Source of the action (e.g. "web", "api", "sync")'),
      userId: z.number().optional().describe('User ID who triggered the event'),
      username: z.string().optional().describe('Username who triggered the event'),
      path: z.string().optional().describe('Path affected by the event'),
      targetPath: z.string().optional().describe('Destination path for move/copy events'),
      groupId: z.string().optional().describe('File group ID'),
      folderId: z.string().optional().describe('Folder ID'),
      entryId: z.string().optional().describe('File entry/version ID'),
      rawEvent: z.record(z.string(), z.unknown()).optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Event type identifier'),
      userId: z.number().optional().describe('User who triggered the event'),
      username: z.string().optional().describe('Username who triggered the event'),
      path: z.string().optional().describe('Primary path affected'),
      targetPath: z.string().optional().describe('Destination path for move/copy events'),
      groupId: z.string().optional().describe('File group ID'),
      folderId: z.string().optional().describe('Folder ID'),
      timestamp: z.string().optional().describe('Event timestamp'),
      actionSource: z.string().optional().describe('Source of the action')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new EgnyteClient({
        token: ctx.auth.token,
        domain: ctx.auth.domain
      });

      let result = (await client.createWebhook({
        url: ctx.input.webhookBaseUrl
      })) as Record<string, unknown>;

      return {
        registrationDetails: {
          webhookId: String(result.webhookId || ''),
          expires: result.expires
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new EgnyteClient({
        token: ctx.auth.token,
        domain: ctx.auth.domain
      });

      let details = ctx.input.registrationDetails as Record<string, unknown>;
      if (details?.webhookId) {
        await client.deleteWebhook(String(details.webhookId));
      }
    },

    handleRequest: async ctx => {
      let body: Record<string, unknown>;
      try {
        body = (await ctx.request.json()) as Record<string, unknown>;
      } catch {
        return { inputs: [] };
      }

      // Egnyte webhooks send an array of events in the body
      let events = Array.isArray(body.events)
        ? body.events
        : Array.isArray(body)
          ? body
          : [body];

      let inputs = events.map((event: Record<string, unknown>) => {
        let data = (event.data || event) as Record<string, unknown>;
        return {
          eventType: String(event.type || event.eventType || 'unknown'),
          webhookId: body.webhookId ? String(body.webhookId) : undefined,
          timestamp: event.timestamp ? String(event.timestamp) : undefined,
          actionSource: data.action_source ? String(data.action_source) : undefined,
          userId: typeof data.user_id === 'number' ? data.user_id : undefined,
          username: data.username ? String(data.username) : undefined,
          path: data.path ? String(data.path) : undefined,
          targetPath: data.target_path ? String(data.target_path) : undefined,
          groupId: data.group_id ? String(data.group_id) : undefined,
          folderId: data.folder_id ? String(data.folder_id) : undefined,
          entryId: data.entry_id ? String(data.entry_id) : undefined,
          rawEvent: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType.replace(':', '.');

      return {
        type: eventType,
        id: `${eventType}-${ctx.input.timestamp || Date.now()}-${ctx.input.path || ctx.input.groupId || Math.random().toString(36).slice(2)}`,
        output: {
          eventType: ctx.input.eventType,
          userId: ctx.input.userId,
          username: ctx.input.username,
          path: ctx.input.path,
          targetPath: ctx.input.targetPath,
          groupId: ctx.input.groupId,
          folderId: ctx.input.folderId,
          timestamp: ctx.input.timestamp,
          actionSource: ctx.input.actionSource
        }
      };
    }
  })
  .build();

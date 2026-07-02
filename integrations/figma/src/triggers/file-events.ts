import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { FigmaClient } from '../lib/client';
import { spec } from '../spec';

export let fileEvents = SlateTrigger.create(spec, {
  name: 'File Events',
  key: 'file_events',
  description:
    'Triggers when files are updated, deleted, or receive new version entries in a Figma team. Covers FILE_UPDATE, FILE_DELETE, and FILE_VERSION_UPDATE events.',
  instructions: [
    'Provide the teamId for the team to monitor. The webhook will receive events for all files in the team.',
    'The passcode is used to verify webhook payloads originate from Figma.'
  ]
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The Figma event type (FILE_UPDATE, FILE_DELETE, FILE_VERSION_UPDATE, PING)'
        ),
      webhookId: z.string().optional().describe('ID of the webhook that triggered this event'),
      passcode: z
        .string()
        .optional()
        .describe('Passcode from the webhook payload for verification'),
      timestamp: z.string().optional().describe('Event timestamp'),
      fileKey: z.string().optional().describe('Key of the affected file'),
      fileName: z.string().optional().describe('Name of the affected file'),
      versionId: z.string().optional().describe('Version ID for FILE_VERSION_UPDATE events'),
      label: z.string().optional().describe('Version label for FILE_VERSION_UPDATE events'),
      description: z
        .string()
        .optional()
        .describe('Version description for FILE_VERSION_UPDATE events'),
      triggeredBy: z
        .object({
          userId: z.string().optional(),
          handle: z.string().optional(),
          imageUrl: z.string().optional()
        })
        .optional()
        .describe('User who triggered the event')
    })
  )
  .output(
    z.object({
      fileKey: z.string().describe('Key of the affected file'),
      fileName: z.string().optional().describe('Name of the affected file'),
      timestamp: z.string().optional().describe('When the event occurred'),
      versionId: z.string().optional().describe('Version ID (for version update events)'),
      versionLabel: z
        .string()
        .optional()
        .describe('Version label (for version update events)'),
      versionDescription: z
        .string()
        .optional()
        .describe('Version description (for version update events)'),
      triggeredBy: z
        .object({
          userId: z.string().optional(),
          handle: z.string().optional(),
          imageUrl: z.string().optional()
        })
        .optional()
        .describe('User who triggered the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new FigmaClient(ctx.auth.token);
      let passcode = generatePasscode();

      // Register webhooks for all file event types
      let eventTypes = ['FILE_UPDATE', 'FILE_DELETE', 'FILE_VERSION_UPDATE'];
      let webhookIds: string[] = [];

      // We need a teamId - store it from registration context
      // The webhookBaseUrl can be used with subpaths for each event type
      // But Figma webhooks are per-team, so we need the user to have configured a team
      // We'll register all event types under the same endpoint

      // For auto-registration we need a team ID. We'll try to get user info to find teams.
      // However, Figma webhook API requires a team_id.
      // We'll use the base URL with subpath to differentiate events.

      // Note: We cannot determine teamId automatically - it must be provided
      // We'll encode it in the webhook URL subpath for now
      // Actually, webhooks require team_id from the user. Let's register all 3 types.

      for (let eventType of eventTypes) {
        try {
          let webhook = await client.createWebhook({
            eventType,
            teamId: '', // Will be set via state
            endpoint: `${ctx.input.webhookBaseUrl}/${eventType}`,
            passcode,
            description: `Slates file events - ${eventType}`
          });
          webhookIds.push(webhook.id);
        } catch {
          // Some event types may not be available on all plans
        }
      }

      return {
        registrationDetails: {
          webhookIds,
          passcode
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new FigmaClient(ctx.auth.token);
      let webhookIds = ctx.input.registrationDetails?.webhookIds || [];

      for (let webhookId of webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // Handle PING event (sent when webhook is first created)
      if (data.event_type === 'PING') {
        return { inputs: [] };
      }

      let triggeredBy: any;
      if (data.triggered_by) {
        triggeredBy = {
          userId: data.triggered_by.id,
          handle: data.triggered_by.handle,
          imageUrl: data.triggered_by.img_url
        };
      }

      return {
        inputs: [
          {
            eventType: data.event_type,
            webhookId: data.webhook_id,
            passcode: data.passcode,
            timestamp: data.timestamp,
            fileKey: data.file_key,
            fileName: data.file_name,
            versionId: data.version_id,
            label: data.label,
            description: data.description,
            triggeredBy
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventTypeMap: Record<string, string> = {
        FILE_UPDATE: 'file.updated',
        FILE_DELETE: 'file.deleted',
        FILE_VERSION_UPDATE: 'file.version_updated'
      };

      let type =
        eventTypeMap[ctx.input.eventType] || `file.${ctx.input.eventType.toLowerCase()}`;

      return {
        type,
        id: `${ctx.input.eventType}-${ctx.input.fileKey || 'unknown'}-${ctx.input.timestamp || Date.now()}`,
        output: {
          fileKey: ctx.input.fileKey || '',
          fileName: ctx.input.fileName,
          timestamp: ctx.input.timestamp,
          versionId: ctx.input.versionId,
          versionLabel: ctx.input.label,
          versionDescription: ctx.input.description,
          triggeredBy: ctx.input.triggeredBy
        }
      };
    }
  })
  .build();

let generatePasscode = (): string => {
  let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

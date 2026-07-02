import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fileEventTypes = [
  'FILE.UPLOADED',
  'FILE.DOWNLOADED',
  'FILE.PREVIEWED',
  'FILE.COPIED',
  'FILE.MOVED',
  'FILE.RENAMED',
  'FILE.LOCKED',
  'FILE.UNLOCKED',
  'FILE.TRASHED',
  'FILE.DELETED',
  'FILE.RESTORED'
] as const;

export let fileEvents = SlateTrigger.create(spec, {
  name: 'File Events',
  key: 'file_events',
  description:
    'Triggers when file lifecycle events occur: uploaded, downloaded, previewed, copied, moved, renamed, locked, unlocked, trashed, deleted, or restored. Attach to a specific folder to monitor all files within.'
})
  .input(
    z.object({
      eventType: z.string().describe('The Box webhook event type (e.g. FILE.UPLOADED)'),
      webhookId: z.string().describe('ID of the webhook that fired'),
      triggeredAt: z.string().describe('ISO 8601 timestamp of the event'),
      source: z.any().describe('The file object from the webhook payload'),
      triggeredBy: z.any().optional().describe('The user who triggered the event')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('ID of the affected file'),
      fileName: z.string().describe('Name of the affected file'),
      fileSize: z.number().optional().describe('File size in bytes'),
      parentFolderId: z.string().optional().describe('ID of the parent folder'),
      parentFolderName: z.string().optional().describe('Name of the parent folder'),
      triggeredByUserId: z
        .string()
        .optional()
        .describe('ID of the user who triggered the event'),
      triggeredByUserName: z
        .string()
        .optional()
        .describe('Name of the user who triggered the event'),
      triggeredByUserEmail: z
        .string()
        .optional()
        .describe('Email of the user who triggered the event'),
      triggeredAt: z.string().describe('ISO 8601 timestamp of the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook('folder', '0', ctx.input.webhookBaseUrl, [
        ...fileEventTypes
      ]);
      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      return {
        inputs: [
          {
            eventType: data.trigger,
            webhookId: data.webhook?.id || '',
            triggeredAt: data.created_at || new Date().toISOString(),
            source: data.source,
            triggeredBy: data.created_by
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let source = ctx.input.source || {};
      let triggeredBy = ctx.input.triggeredBy || {};
      let eventType = ctx.input.eventType.toLowerCase().replace('.', '.');

      return {
        type: eventType,
        id: `${ctx.input.webhookId}-${source.id || ''}-${ctx.input.triggeredAt}`,
        output: {
          fileId: source.id || '',
          fileName: source.name || '',
          fileSize: source.size,
          parentFolderId: source.parent?.id,
          parentFolderName: source.parent?.name,
          triggeredByUserId: triggeredBy.id,
          triggeredByUserName: triggeredBy.name,
          triggeredByUserEmail: triggeredBy.login,
          triggeredAt: ctx.input.triggeredAt
        }
      };
    }
  });

import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let folderEventTypes = [
  'FOLDER.CREATED',
  'FOLDER.DOWNLOADED',
  'FOLDER.COPIED',
  'FOLDER.MOVED',
  'FOLDER.RENAMED',
  'FOLDER.TRASHED',
  'FOLDER.DELETED',
  'FOLDER.RESTORED'
] as const;

export let folderEvents = SlateTrigger.create(spec, {
  name: 'Folder Events',
  key: 'folder_events',
  description:
    'Triggers when folder lifecycle events occur: created, downloaded, copied, moved, renamed, trashed, deleted, or restored.'
})
  .input(
    z.object({
      eventType: z.string().describe('The Box webhook event type (e.g. FOLDER.CREATED)'),
      webhookId: z.string().describe('ID of the webhook that fired'),
      triggeredAt: z.string().describe('ISO 8601 timestamp of the event'),
      source: z.any().describe('The folder object from the webhook payload'),
      triggeredBy: z.any().optional().describe('The user who triggered the event')
    })
  )
  .output(
    z.object({
      folderId: z.string().describe('ID of the affected folder'),
      folderName: z.string().describe('Name of the affected folder'),
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
        ...folderEventTypes
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
          folderId: source.id || '',
          folderName: source.name || '',
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

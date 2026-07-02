import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let folderEvents = SlateTrigger.create(spec, {
  name: 'Folder & Project Events',
  key: 'folder_events',
  description:
    'Triggers on folder and project changes including creation, deletion, title changes, description changes, sharing changes, comment and attachment activity, custom field changes, and project-specific changes like dates, owners, and status.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of folder/project event'),
      folderId: z.string().describe('ID of the affected folder or project'),
      webhookId: z.string().describe('ID of the webhook that fired'),
      eventAuthorId: z.string().optional().describe('ID of the user who triggered the event'),
      lastUpdatedDate: z.string().optional().describe('Timestamp of the event'),
      oldValue: z.string().optional().describe('Previous value (for change events)'),
      newValue: z.string().optional().describe('New value (for change events)'),
      addedIds: z.array(z.string()).optional().describe('Added IDs (for list change events)'),
      removedIds: z
        .array(z.string())
        .optional()
        .describe('Removed IDs (for list change events)')
    })
  )
  .output(
    z.object({
      folderId: z.string().describe('ID of the affected folder or project'),
      eventAuthorId: z.string().optional().describe('ID of the user who triggered the event'),
      lastUpdatedDate: z.string().optional().describe('Timestamp of the event'),
      oldValue: z.string().optional().describe('Previous value (for change events)'),
      newValue: z.string().optional().describe('New value (for change events)'),
      addedIds: z.array(z.string()).optional().describe('Added IDs (for list change events)'),
      removedIds: z
        .array(z.string())
        .optional()
        .describe('Removed IDs (for list change events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new WrikeClient({
        token: ctx.auth.token,
        host: ctx.auth.host
      });

      let webhook = await client.createWebhook({
        hookUrl: ctx.input.webhookBaseUrl,
        events: [
          'FolderCreated',
          'FolderDeleted',
          'FolderTitleChanged',
          'FolderDescriptionChanged',
          'FolderParentsAdded',
          'FolderParentsRemoved',
          'FolderSharedsAdded',
          'FolderSharedsRemoved',
          'FolderCommentAdded',
          'FolderCommentDeleted',
          'FolderAttachmentAdded',
          'FolderAttachmentDeleted',
          'FolderCustomFieldChanged',
          'ProjectDatesChanged',
          'ProjectOwnersAdded',
          'ProjectOwnersRemoved',
          'ProjectStatusChanged'
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WrikeClient({
        token: ctx.auth.token,
        host: ctx.auth.host
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Array<{
        webhookId: string;
        eventType: string;
        folderId?: string;
        eventAuthorId?: string;
        lastUpdatedDate?: string;
        oldValue?: string;
        newValue?: string;
        addedIds?: string[];
        removedIds?: string[];
      }>;

      if (!Array.isArray(body)) {
        return { inputs: [] };
      }

      let folderInputs = body
        .filter(event => event.folderId)
        .map(event => ({
          eventType: event.eventType,
          folderId: event.folderId!,
          webhookId: event.webhookId,
          eventAuthorId: event.eventAuthorId,
          lastUpdatedDate: event.lastUpdatedDate,
          oldValue: event.oldValue,
          newValue: event.newValue,
          addedIds: event.addedIds,
          removedIds: event.removedIds
        }));

      return { inputs: folderInputs };
    },

    handleEvent: async ctx => {
      let eventTypeMap: Record<string, string> = {
        FolderCreated: 'folder.created',
        FolderDeleted: 'folder.deleted',
        FolderTitleChanged: 'folder.title_changed',
        FolderDescriptionChanged: 'folder.description_changed',
        FolderParentsAdded: 'folder.parents_added',
        FolderParentsRemoved: 'folder.parents_removed',
        FolderSharedsAdded: 'folder.shareds_added',
        FolderSharedsRemoved: 'folder.shareds_removed',
        FolderCommentAdded: 'folder.comment_added',
        FolderCommentDeleted: 'folder.comment_deleted',
        FolderAttachmentAdded: 'folder.attachment_added',
        FolderAttachmentDeleted: 'folder.attachment_deleted',
        FolderCustomFieldChanged: 'folder.custom_field_changed',
        ProjectDatesChanged: 'project.dates_changed',
        ProjectOwnersAdded: 'project.owners_added',
        ProjectOwnersRemoved: 'project.owners_removed',
        ProjectStatusChanged: 'project.status_changed'
      };

      let type =
        eventTypeMap[ctx.input.eventType] || `folder.${ctx.input.eventType.toLowerCase()}`;

      return {
        type,
        id: `${ctx.input.folderId}-${ctx.input.eventType}-${ctx.input.lastUpdatedDate || Date.now()}`,
        output: {
          folderId: ctx.input.folderId,
          eventAuthorId: ctx.input.eventAuthorId,
          lastUpdatedDate: ctx.input.lastUpdatedDate,
          oldValue: ctx.input.oldValue,
          newValue: ctx.input.newValue,
          addedIds: ctx.input.addedIds,
          removedIds: ctx.input.removedIds
        }
      };
    }
  })
  .build();

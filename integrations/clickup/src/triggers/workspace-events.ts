import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { spec } from '../spec';

let WORKSPACE_WEBHOOK_EVENTS = [
  'listCreated',
  'listUpdated',
  'listDeleted',
  'folderCreated',
  'folderUpdated',
  'folderDeleted',
  'spaceCreated',
  'spaceUpdated',
  'spaceDeleted',
  'goalCreated',
  'goalUpdated',
  'goalDeleted',
  'keyResultCreated',
  'keyResultUpdated',
  'keyResultDeleted'
];

export let workspaceEvents = SlateTrigger.create(spec, {
  name: 'Workspace Events',
  key: 'workspace_events',
  description:
    'Triggered when workspace structure changes: spaces, folders, lists, goals, or key results are created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('The ClickUp webhook event type'),
      webhookId: z.string().describe('The webhook ID that triggered this event'),
      resourceId: z.string().describe('The ID of the affected resource'),
      resourceType: z
        .string()
        .describe('The type of resource (space, folder, list, goal, key_result)'),
      historyItems: z
        .array(z.any())
        .optional()
        .describe('History items describing what changed'),
      rawPayload: z.any().optional().describe('The full raw webhook payload')
    })
  )
  .output(
    z.object({
      resourceId: z.string(),
      resourceType: z.string(),
      resourceName: z.string().optional(),
      parentId: z.string().optional(),
      changes: z
        .array(
          z.object({
            field: z.string(),
            previousValue: z.any().optional(),
            newValue: z.any().optional()
          })
        )
        .optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ClickUpClient(ctx.auth.token);
      let result = await client.createWebhook(ctx.config.workspaceId, {
        endpoint: ctx.input.webhookBaseUrl,
        events: WORKSPACE_WEBHOOK_EVENTS
      });

      return {
        registrationDetails: {
          webhookId: result.id ?? result.webhook?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ClickUpClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (!body.event) {
        return { inputs: [] };
      }

      let eventType: string = body.event;

      // Determine resource type and ID from the event
      let resourceType = 'unknown';
      let resourceId = '';

      if (eventType.startsWith('list')) {
        resourceType = 'list';
        resourceId = body.list_id ?? '';
      } else if (eventType.startsWith('folder')) {
        resourceType = 'folder';
        resourceId = body.folder_id ?? '';
      } else if (eventType.startsWith('space')) {
        resourceType = 'space';
        resourceId = body.space_id ?? '';
      } else if (eventType.startsWith('goal')) {
        resourceType = 'goal';
        resourceId = body.goal_id ?? '';
      } else if (eventType.startsWith('keyResult')) {
        resourceType = 'key_result';
        resourceId = body.key_result_id ?? '';
      }

      return {
        inputs: [
          {
            eventType,
            webhookId: body.webhook_id ?? '',
            resourceId,
            resourceType,
            historyItems: body.history_items ?? [],
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType;
      let historyItems = ctx.input.historyItems ?? [];

      let changes = historyItems.map((item: any) => ({
        field: item.field,
        previousValue: item.before,
        newValue: item.after
      }));

      // Map event names to our type format
      let typeMap: Record<string, string> = {
        listCreated: 'list.created',
        listUpdated: 'list.updated',
        listDeleted: 'list.deleted',
        folderCreated: 'folder.created',
        folderUpdated: 'folder.updated',
        folderDeleted: 'folder.deleted',
        spaceCreated: 'space.created',
        spaceUpdated: 'space.updated',
        spaceDeleted: 'space.deleted',
        goalCreated: 'goal.created',
        goalUpdated: 'goal.updated',
        goalDeleted: 'goal.deleted',
        keyResultCreated: 'key_result.created',
        keyResultUpdated: 'key_result.updated',
        keyResultDeleted: 'key_result.deleted'
      };

      let type = typeMap[eventType] ?? `${ctx.input.resourceType}.${eventType}`;

      // Extract name from history items if available
      let resourceName: string | undefined;
      let nameItem = historyItems.find((item: any) => item.field === 'name');
      if (nameItem) {
        resourceName = nameItem.after ?? nameItem.before;
      }

      return {
        type,
        id: `${ctx.input.webhookId}-${ctx.input.resourceId}-${eventType}-${Date.now()}`,
        output: {
          resourceId: ctx.input.resourceId,
          resourceType: ctx.input.resourceType,
          resourceName,
          parentId: undefined,
          changes
        }
      };
    }
  })
  .build();

import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import {
  type ClickUpWebhookRegistrationDetails,
  registerClickUpWebhooks,
  resolveClickUpWebhookRegistration,
  unregisterClickUpWebhooks,
  verifyClickUpWebhookSignature
} from '../lib/webhooks';
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
    'Triggered across all ClickUp Workspaces authorized for the connection when spaces, folders, lists, goals, or key results are created, updated, or deleted.'
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
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
      workspaceId: workspaceIdSchema,
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
      let registrationDetails = await registerClickUpWebhooks({
        client,
        endpoint: ctx.input.webhookBaseUrl,
        events: WORKSPACE_WEBHOOK_EVENTS
      });

      return { registrationDetails };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ClickUpClient(ctx.auth.token);
      await unregisterClickUpWebhooks({
        client,
        details: ctx.input.registrationDetails as ClickUpWebhookRegistrationDetails
      });
    },

    handleRequest: async ctx => {
      let rawBody = await ctx.request.text();
      let body: any;
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = {};
      }

      let registration = resolveClickUpWebhookRegistration(
        ctx.registrationDetails as ClickUpWebhookRegistrationDetails | null,
        body.webhook_id
      );

      if (
        !verifyClickUpWebhookSignature({
          secret: registration.secret,
          payload: rawBody,
          signature: ctx.request.headers.get('x-signature')
        })
      ) {
        return {
          inputs: [],
          response: new Response('Invalid signature', { status: 401 })
        };
      }

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
            workspaceId: registration.workspaceId,
            eventType,
            webhookId: body.webhook_id,
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
          workspaceId: ctx.input.workspaceId,
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

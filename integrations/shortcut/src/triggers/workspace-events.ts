import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let changeSchema = z
  .record(z.string(), z.any())
  .optional()
  .describe('Object detailing what changed with old/new values');

let actionSchema = z.object({
  entityId: z.union([z.number(), z.string()]).describe('ID of the affected entity'),
  entityType: z.string().describe('Type: story, epic, story-task, story-comment, etc.'),
  action: z.string().describe('Action: create, update, or delete'),
  name: z.string().optional().describe('Name of the affected entity'),
  changes: changeSchema
});

let referenceSchema = z.object({
  referenceId: z.union([z.number(), z.string()]).describe('ID of the referenced entity'),
  entityType: z.string().describe('Type of the referenced entity'),
  name: z.string().optional().describe('Name of the referenced entity')
});

export let workspaceEvents = SlateTrigger.create(spec, {
  name: 'Workspace Events',
  key: 'workspace_events',
  description:
    'Fires on all workspace changes including story/epic creates, updates, deletes, comment changes, task changes, and workflow state transitions. Shortcut webhooks send all workspace events — they cannot be filtered by type.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique ID of the webhook event'),
      changedAt: z.string().describe('Timestamp of the change'),
      memberId: z.string().nullable().describe('UUID of the member who made the change'),
      primaryId: z
        .union([z.number(), z.string()])
        .nullable()
        .describe('ID of the primary entity involved'),
      actions: z.array(actionSchema).describe('Array of actions in this event'),
      references: z
        .array(referenceSchema)
        .describe('Contextual references for IDs in the actions')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique ID of the webhook event'),
      changedAt: z.string().describe('Timestamp of the change'),
      memberId: z.string().nullable().describe('UUID of the member who made the change'),
      primaryId: z
        .union([z.number(), z.string()])
        .nullable()
        .describe('ID of the primary entity'),
      entityType: z
        .string()
        .describe('Type of the primary entity affected (e.g., story, epic)'),
      action: z.string().describe('Primary action: create, update, or delete'),
      entityName: z.string().nullable().describe('Name of the primary entity if available'),
      changes: z
        .record(z.string(), z.any())
        .nullable()
        .describe('Details of the changes (old/new values)'),
      actions: z.array(actionSchema).describe('All actions in this event'),
      references: z.array(referenceSchema).describe('Context references')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl);

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
      let data = (await ctx.request.json()) as any;

      // Shortcut sends a single event per webhook call
      let actions = (data.actions || []).map((a: any) => ({
        entityId: a.id,
        entityType: a.entity_type,
        action: a.action,
        name: a.name,
        changes: a.changes
      }));

      let references = (data.references || []).map((r: any) => ({
        referenceId: r.id,
        entityType: r.entity_type,
        name: r.name
      }));

      return {
        inputs: [
          {
            eventId: data.id,
            changedAt: data.changed_at,
            memberId: data.member_id ?? null,
            primaryId: data.primary_id ?? null,
            actions,
            references
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let primaryAction = ctx.input.actions[0];
      let entityType = primaryAction?.entityType || 'unknown';
      let action = primaryAction?.action || 'unknown';

      return {
        type: `${entityType}.${action}`,
        id: ctx.input.eventId,
        output: {
          eventId: ctx.input.eventId,
          changedAt: ctx.input.changedAt,
          memberId: ctx.input.memberId,
          primaryId: ctx.input.primaryId,
          entityType,
          action,
          entityName: primaryAction?.name ?? null,
          changes: primaryAction?.changes ?? null,
          actions: ctx.input.actions,
          references: ctx.input.references
        }
      };
    }
  })
  .build();

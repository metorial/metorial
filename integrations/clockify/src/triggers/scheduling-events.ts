import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let schedulingEventTypes = [
  'ASSIGNMENT_CREATED',
  'ASSIGNMENT_UPDATED',
  'ASSIGNMENT_DELETED',
  'ASSIGNMENT_PUBLISHED'
] as const;

let eventTypeMap: Record<string, string> = {
  ASSIGNMENT_CREATED: 'assignment.created',
  ASSIGNMENT_UPDATED: 'assignment.updated',
  ASSIGNMENT_DELETED: 'assignment.deleted',
  ASSIGNMENT_PUBLISHED: 'assignment.published'
};

export let schedulingEvents = SlateTrigger.create(spec, {
  name: 'Scheduling Events',
  key: 'scheduling_events',
  description:
    'Triggered when scheduled assignments are created, updated, deleted, or published.'
})
  .input(
    z.object({
      eventType: z.string().describe('Clockify webhook event type'),
      assignment: z.any().describe('Assignment data from webhook payload')
    })
  )
  .output(
    z.object({
      assignmentId: z.string(),
      userId: z.string().optional(),
      projectId: z.string().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
      published: z.boolean().optional(),
      workspaceId: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let webhookIds: string[] = [];
      for (let eventType of schedulingEventTypes) {
        let webhook = await client.createWebhook({
          name: `slates_${eventType}`,
          url: ctx.input.webhookBaseUrl,
          triggerEvent: eventType
        });
        webhookIds.push(webhook.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let details = ctx.input.registrationDetails as { webhookIds: string[] };
      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_e) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.triggerEvent || data.eventType || 'UNKNOWN',
            assignment: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let assignment = ctx.input.assignment;
      let assignmentId = assignment.id || assignment.assignmentId || 'unknown';
      let mappedType =
        eventTypeMap[ctx.input.eventType] || `assignment.${ctx.input.eventType.toLowerCase()}`;

      return {
        type: mappedType,
        id: `${ctx.input.eventType}_${assignmentId}_${assignment.changeDate || Date.now()}`,
        output: {
          assignmentId,
          userId: assignment.userId || undefined,
          projectId: assignment.projectId || undefined,
          start: assignment.start || undefined,
          end: assignment.end || undefined,
          published: assignment.published,
          workspaceId: assignment.workspaceId || undefined
        }
      };
    }
  })
  .build();

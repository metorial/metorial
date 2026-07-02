import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

let TASK_WEBHOOK_SETTINGS = ['add_task', 'update_task', 'delete_task', 'responsible_task'];

export let taskEventsTrigger = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description: 'Triggers when a task is added, updated, deleted, or changes responsible user.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of task event'),
      taskId: z.number().describe('Task ID'),
      text: z.string().optional().describe('Task text'),
      responsibleUserId: z.number().optional().describe('Responsible user ID'),
      entityId: z.number().optional().describe('Linked entity ID'),
      entityType: z.string().optional().describe('Linked entity type'),
      taskTypeId: z.number().optional().describe('Task type ID'),
      completeTill: z.number().optional().describe('Deadline timestamp'),
      isCompleted: z.boolean().optional().describe('Whether task is completed'),
      createdAt: z.number().optional().describe('Task creation timestamp'),
      updatedAt: z.number().optional().describe('Task update timestamp'),
      accountId: z.number().optional().describe('Account ID')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Task ID'),
      text: z.string().optional().describe('Task text'),
      responsibleUserId: z.number().optional().describe('Responsible user ID'),
      entityId: z.number().optional().describe('Linked entity ID'),
      entityType: z.string().optional().describe('Linked entity type'),
      taskTypeId: z.number().optional().describe('Task type ID'),
      completeTill: z.number().optional().describe('Deadline timestamp'),
      isCompleted: z.boolean().optional().describe('Whether task is completed'),
      createdAt: z.number().optional().describe('Task creation timestamp'),
      updatedAt: z.number().optional().describe('Task update timestamp'),
      accountId: z.number().optional().describe('Account ID')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new KommoClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      let webhookUrl = ctx.input.webhookBaseUrl;
      await client.createWebhook(webhookUrl, TASK_WEBHOOK_SETTINGS);

      return {
        registrationDetails: { destination: webhookUrl, settings: TASK_WEBHOOK_SETTINGS }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new KommoClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      await client.deleteWebhook(ctx.input.registrationDetails.destination);
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        let jsonStr = params.get('') || text;
        body = JSON.parse(jsonStr);
      } catch {
        try {
          body = await ctx.request.json();
        } catch {
          return { inputs: [] };
        }
      }

      let inputs: any[] = [];

      let eventTypes: Record<string, string> = {
        add_task: 'task.added',
        update_task: 'task.updated',
        delete_task: 'task.deleted',
        responsible_task: 'task.responsible_changed'
      };

      for (let [webhookKey, eventType] of Object.entries(eventTypes)) {
        let eventData = body[webhookKey];
        if (!eventData) continue;

        let items = Array.isArray(eventData) ? eventData : [eventData];
        for (let item of items) {
          inputs.push({
            eventType,
            taskId: Number(item.id),
            text: item.text,
            responsibleUserId:
              item.responsible_user_id != null ? Number(item.responsible_user_id) : undefined,
            entityId: item.entity_id != null ? Number(item.entity_id) : undefined,
            entityType: item.entity_type,
            taskTypeId: item.task_type_id != null ? Number(item.task_type_id) : undefined,
            completeTill: item.complete_till != null ? Number(item.complete_till) : undefined,
            isCompleted: item.is_completed != null ? Boolean(item.is_completed) : undefined,
            createdAt: item.created_at != null ? Number(item.created_at) : undefined,
            updatedAt: item.updated_at != null ? Number(item.updated_at) : undefined,
            accountId: body.account_id != null ? Number(body.account_id) : undefined
          });
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.taskId}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          taskId: ctx.input.taskId,
          text: ctx.input.text,
          responsibleUserId: ctx.input.responsibleUserId,
          entityId: ctx.input.entityId,
          entityType: ctx.input.entityType,
          taskTypeId: ctx.input.taskTypeId,
          completeTill: ctx.input.completeTill,
          isCompleted: ctx.input.isCompleted,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt,
          accountId: ctx.input.accountId
        }
      };
    }
  })
  .build();

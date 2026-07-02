import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let expenseEventTypes = [
  'EXPENSE_CREATED',
  'EXPENSE_UPDATED',
  'EXPENSE_DELETED',
  'EXPENSE_RESTORED'
] as const;

let eventTypeMap: Record<string, string> = {
  EXPENSE_CREATED: 'expense.created',
  EXPENSE_UPDATED: 'expense.updated',
  EXPENSE_DELETED: 'expense.deleted',
  EXPENSE_RESTORED: 'expense.restored'
};

export let expenseEvents = SlateTrigger.create(spec, {
  name: 'Expense Events',
  key: 'expense_events',
  description: 'Triggered when expenses are created, updated, deleted, or restored.'
})
  .input(
    z.object({
      eventType: z.string().describe('Clockify webhook event type'),
      expense: z.any().describe('Expense data from webhook payload')
    })
  )
  .output(
    z.object({
      expenseId: z.string(),
      projectId: z.string().optional(),
      categoryId: z.string().optional(),
      userId: z.string().optional(),
      billable: z.boolean().optional(),
      totalAmount: z.number().optional(),
      date: z.string().optional(),
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
      for (let eventType of expenseEventTypes) {
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
            expense: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let expense = ctx.input.expense;
      let expenseId = expense.id || expense.expenseId || 'unknown';
      let mappedType =
        eventTypeMap[ctx.input.eventType] || `expense.${ctx.input.eventType.toLowerCase()}`;

      return {
        type: mappedType,
        id: `${ctx.input.eventType}_${expenseId}_${expense.changeDate || Date.now()}`,
        output: {
          expenseId,
          projectId: expense.projectId || undefined,
          categoryId: expense.categoryId || undefined,
          userId: expense.userId || undefined,
          billable: expense.billable,
          totalAmount: expense.totalAmount,
          date: expense.date || undefined,
          workspaceId: expense.workspaceId || undefined
        }
      };
    }
  })
  .build();

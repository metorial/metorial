import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let expenseEvents = SlateTrigger.create(spec, {
  name: 'Expense Events',
  key: 'expense_events',
  description: 'Triggers when a project expense is created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type: create, update, or delete'),
      expenseId: z.number().describe('Expense ID'),
      timestamp: z.string().describe('Event timestamp'),
      userId: z.number().optional().describe('User ID that triggered the event'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      expenseId: z.number().describe('Expense ID'),
      title: z.string().optional().describe('Expense title'),
      date: z.string().optional().describe('Expense date'),
      netTotal: z.number().optional().describe('Net total'),
      billable: z.boolean().optional().describe('Whether the expense is billable'),
      projectId: z.number().optional().describe('Associated project ID'),
      projectName: z.string().optional().describe('Associated project name')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

      let events = ['create', 'update', 'delete'];
      let registrations: Array<{ webhookId: number; event: string }> = [];

      for (let event of events) {
        let webhook = await client.createWebhook({
          target: 'Expense',
          event,
          hook: ctx.input.webhookBaseUrl
        });
        registrations.push({ webhookId: webhook.id, event });
      }

      return { registrationDetails: { webhooks: registrations } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
      let details = ctx.input.registrationDetails as {
        webhooks: Array<{ webhookId: number }>;
      };

      for (let reg of details.webhooks) {
        try {
          await client.deleteWebhook(reg.webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let event = ctx.request.headers.get('X-Moco-Event') || 'update';
      let timestamp = ctx.request.headers.get('X-Moco-Timestamp') || new Date().toISOString();
      let userId = ctx.request.headers.get('X-Moco-User-Id');

      return {
        inputs: [
          {
            eventType: event,
            expenseId: body.id,
            timestamp,
            userId: userId ? Number(userId) : undefined,
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;

      return {
        type: `expense.${ctx.input.eventType}`,
        id: `expense-${ctx.input.expenseId}-${ctx.input.timestamp}`,
        output: {
          expenseId: ctx.input.expenseId,
          title: p?.title,
          date: p?.date,
          netTotal: p?.net_total,
          billable: p?.billable,
          projectId: p?.project?.id,
          projectName: p?.project?.name
        }
      };
    }
  })
  .build();

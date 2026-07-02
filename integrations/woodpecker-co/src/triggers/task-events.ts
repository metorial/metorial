import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let TASK_EVENTS = ['task_created', 'task_done', 'task_ignored'] as const;

let webhookInputSchema = z.object({
  eventType: z.string().describe('Webhook event type'),
  eventPayload: z.any().describe('Raw webhook event payload')
});

let taskEventOutputSchema = z.object({
  prospectId: z.number().optional().describe('Prospect ID'),
  prospectEmail: z.string().optional().describe('Prospect email'),
  campaignId: z.number().optional().describe('Campaign ID'),
  campaignName: z.string().optional().describe('Campaign name'),
  taskType: z.string().optional().describe('Type of manual task'),
  taskName: z.string().optional().describe('Task name'),
  taskMessage: z.string().optional().describe('Task description'),
  dueDate: z.string().optional().describe('Task due date'),
  timestamp: z.string().optional().describe('Event timestamp')
});

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description:
    'Triggered when a manual task is created, marked as done, or ignored for a prospect within a campaign.'
})
  .input(webhookInputSchema)
  .output(taskEventOutputSchema)
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        companyId: ctx.config.companyId
      });

      let registeredEvents: string[] = [];
      for (let event of TASK_EVENTS) {
        try {
          await client.subscribeWebhook(ctx.input.webhookBaseUrl, event);
          registeredEvents.push(event);
        } catch (err: any) {
          if (err?.response?.status !== 409) {
            throw err;
          }
          registeredEvents.push(event);
        }
      }

      return {
        registrationDetails: { events: registeredEvents, targetUrl: ctx.input.webhookBaseUrl }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        companyId: ctx.config.companyId
      });

      let details = ctx.input.registrationDetails as { events: string[]; targetUrl: string };
      for (let event of details.events) {
        try {
          await client.unsubscribeWebhook(details.targetUrl, event);
        } catch {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = await ctx.request.json();
      let events = Array.isArray(data) ? data : [data];

      return {
        inputs: events.map((event: any) => ({
          eventType: event.method ?? event.event ?? 'unknown',
          eventPayload: event
        }))
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.eventPayload;
      let prospect = payload.prospect ?? {};
      let campaign = payload.campaign ?? {};
      let task = payload.task ?? {};

      let eventType = (ctx.input.eventType ?? 'unknown').toLowerCase();

      return {
        type: `task.${eventType.replace('task_', '')}`,
        id: `${eventType}_${prospect.id ?? ''}_${payload.timestamp ?? Date.now()}`,
        output: {
          prospectId: prospect.id,
          prospectEmail: prospect.email,
          campaignId: campaign.campaign_id ?? prospect.campaign_id,
          campaignName: campaign.campaign_name ?? prospect.campaign_name,
          taskType: task.type,
          taskName: task.name,
          taskMessage: task.message,
          dueDate: task.due_date,
          timestamp: payload.timestamp
        }
      };
    }
  })
  .build();

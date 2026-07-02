import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let projectEvents = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description: 'Triggers when a project is created, updated, deleted, or archived/unarchived.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type: create, update, delete, archive'),
      projectId: z.number().describe('Project ID'),
      timestamp: z.string().describe('Event timestamp'),
      userId: z.number().optional().describe('User ID that triggered the event'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Project ID'),
      name: z.string().optional().describe('Project name'),
      identifier: z.string().optional().describe('Project identifier'),
      active: z.boolean().optional().describe('Whether the project is active'),
      currency: z.string().optional().describe('Project currency'),
      startDate: z.string().optional().describe('Project start date'),
      finishDate: z.string().optional().describe('Project finish date'),
      customerId: z.number().optional().describe('Customer company ID'),
      customerName: z.string().optional().describe('Customer company name'),
      leaderId: z.number().optional().describe('Project leader user ID'),
      leaderName: z.string().optional().describe('Project leader name')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

      let events = ['create', 'update', 'delete'];
      let registrations: Array<{ webhookId: number; event: string }> = [];

      for (let event of events) {
        let webhook = await client.createWebhook({
          target: 'Project',
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
            projectId: body.id,
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
        type: `project.${ctx.input.eventType}`,
        id: `project-${ctx.input.projectId}-${ctx.input.timestamp}`,
        output: {
          projectId: ctx.input.projectId,
          name: p?.name,
          identifier: p?.identifier,
          active: p?.active,
          currency: p?.currency,
          startDate: p?.start_date,
          finishDate: p?.finish_date,
          customerId: p?.customer?.id,
          customerName: p?.customer?.name,
          leaderId: p?.leader?.id,
          leaderName: p?.leader ? `${p.leader.firstname} ${p.leader.lastname}` : undefined
        }
      };
    }
  })
  .build();

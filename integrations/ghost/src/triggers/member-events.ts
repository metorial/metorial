import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

let memberEventTypes = ['member.added', 'member.edited', 'member.deleted'] as const;

export let memberEvents = SlateTrigger.create(spec, {
  name: 'Member Events',
  key: 'member_events',
  description:
    'Triggered when members (subscribers) are added, edited, or deleted. Note: CSV imports may not trigger these events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of member event'),
      member: z.any().describe('Member data from the webhook payload')
    })
  )
  .output(
    z.object({
      memberId: z.string().describe('Member ID'),
      email: z.string().describe('Member email address'),
      name: z.string().nullable().describe('Member name'),
      status: z.string().describe('Member status (free, paid, comped)'),
      note: z.string().nullable().describe('Internal note'),
      createdAt: z.string().nullable().describe('Creation timestamp'),
      updatedAt: z.string().nullable().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GhostAdminClient({
        domain: ctx.config.adminDomain,
        apiKey: ctx.auth.token
      });

      let webhookIds: string[] = [];
      for (let event of memberEventTypes) {
        let result = await client.createWebhook({
          event,
          targetUrl: `${ctx.input.webhookBaseUrl}/${event}`,
          name: `Slates: ${event}`
        });
        webhookIds.push(result.webhooks[0].id);
      }

      return { registrationDetails: { webhookIds } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new GhostAdminClient({
        domain: ctx.config.adminDomain,
        apiKey: ctx.auth.token
      });

      let details = ctx.input.registrationDetails as { webhookIds: string[] };
      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/');
      let eventType = pathParts.slice(-2).join('.') || 'member.edited';

      let member = data?.member?.current ?? data?.member ?? data;

      return {
        inputs: [
          {
            eventType,
            member
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let member = ctx.input.member ?? {};

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${member.id ?? 'unknown'}-${member.updated_at ?? Date.now()}`,
        output: {
          memberId: member.id ?? '',
          email: member.email ?? '',
          name: member.name ?? null,
          status: member.status ?? 'free',
          note: member.note ?? null,
          createdAt: member.created_at ?? null,
          updatedAt: member.updated_at ?? null
        }
      };
    }
  })
  .build();

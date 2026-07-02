import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

export let membershipEvents = SlateTrigger.create(spec, {
  name: 'Membership Events',
  key: 'membership_events',
  description:
    'Triggers when people join, are updated in, or leave Webex spaces (membership created, updated, or deleted).'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of membership event'),
      webhookPayload: z.any().describe('Raw webhook notification payload from Webex')
    })
  )
  .output(
    z.object({
      membershipId: z.string().describe('ID of the membership'),
      roomId: z.string().optional().describe('ID of the space'),
      personId: z.string().optional().describe('ID of the person'),
      personEmail: z.string().optional().describe('Email of the person'),
      personDisplayName: z.string().optional().describe('Display name of the person'),
      personOrgId: z.string().optional().describe('Organization ID of the person'),
      isModerator: z.boolean().optional().describe('Whether the person is a moderator'),
      roomType: z.string().optional().describe('Type of room (direct or group)'),
      created: z.string().optional().describe('Membership creation timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new WebexClient({ token: ctx.auth.token });

      let events = ['created', 'updated', 'deleted'];
      let webhookIds: string[] = [];

      for (let event of events) {
        let webhook = await client.createWebhook({
          name: `Slates Membership ${event}`,
          targetUrl: ctx.input.webhookBaseUrl,
          resource: 'memberships',
          event
        });
        webhookIds.push(webhook.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WebexClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds || []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event,
            webhookPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.webhookPayload;
      let resourceData = payload.data || {};

      let membership = resourceData;
      if (ctx.input.eventType !== 'deleted' && resourceData.id) {
        try {
          let client = new WebexClient({ token: ctx.auth.token });
          membership = await client.getMembership(resourceData.id);
        } catch {
          // Fall back to webhook data
        }
      }

      return {
        type: `membership.${ctx.input.eventType}`,
        id: payload.id || resourceData.id || `membership-${Date.now()}`,
        output: {
          membershipId: membership.id || resourceData.id,
          roomId: membership.roomId || resourceData.roomId,
          personId: membership.personId || resourceData.personId,
          personEmail: membership.personEmail || resourceData.personEmail,
          personDisplayName: membership.personDisplayName || resourceData.personDisplayName,
          personOrgId: membership.personOrgId || resourceData.personOrgId,
          isModerator: membership.isModerator,
          roomType: membership.roomType || resourceData.roomType,
          created: membership.created || resourceData.created
        }
      };
    }
  })
  .build();

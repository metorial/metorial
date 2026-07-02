import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ENGAGEMENT_EVENT_TYPES = [
  'form_submission_completed',
  'referral_completed',
  'promotion_updated',
  'reward_updated'
] as const;

export let engagementEvents = SlateTrigger.create(spec, {
  name: 'Engagement Events',
  key: 'engagement_events',
  description:
    'Triggers when a form submission is completed, a referral is completed, or a promotion/reward is updated.'
})
  .input(
    z.object({
      eventType: z.enum(ENGAGEMENT_EVENT_TYPES).describe('Type of engagement event'),
      webhookUuid: z.string().optional().describe('Unique event identifier'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      resourceUuid: z.string().describe('UUID of the affected resource'),
      resourceType: z
        .string()
        .describe('Type of resource (form_submission, referral, promotion, reward)'),
      contactUuid: z.string().optional().describe('UUID of the contact involved'),
      name: z.string().optional().describe('Name/title of the resource'),
      status: z.string().optional().describe('Status of the resource'),
      createdAt: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations: Array<{ eventType: string; subscriptionUuid: string }> = [];

      for (let eventType of ENGAGEMENT_EVENT_TYPES) {
        try {
          let result = await client.createWebhookSubscription({
            name: `Slates - ${eventType}`,
            eventType,
            url: ctx.input.webhookBaseUrl
          });
          let sub = result.data || result;
          registrations.push({ eventType, subscriptionUuid: sub.uuid });
        } catch {
          /* skip */
        }
      }

      return { registrationDetails: { subscriptions: registrations } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        subscriptions: Array<{ subscriptionUuid: string }>;
      };

      for (let sub of details.subscriptions || []) {
        try {
          await client.deleteWebhookSubscription(sub.subscriptionUuid);
        } catch {
          /* ignore cleanup errors */
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = body.event_type || body.type || 'form_submission_completed';

      return {
        inputs: [
          {
            eventType: ENGAGEMENT_EVENT_TYPES.includes(eventType)
              ? eventType
              : 'form_submission_completed',
            webhookUuid: body.uuid || body.id || `engagement-${Date.now()}`,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, rawPayload } = ctx.input;
      let data = rawPayload?.data || rawPayload || {};

      let resourceTypeMap: Record<string, string> = {
        form_submission_completed: 'form_submission',
        referral_completed: 'referral',
        promotion_updated: 'promotion',
        reward_updated: 'reward'
      };

      let resourceType = resourceTypeMap[eventType] || eventType;
      let eventSuffix = eventType.includes('completed') ? 'completed' : 'updated';

      return {
        type: `${resourceType}.${eventSuffix}`,
        id: ctx.input.webhookUuid || `engagement-${Date.now()}`,
        output: {
          resourceUuid: data.uuid || '',
          resourceType,
          contactUuid: data.contact?.uuid,
          name: data.name || data.title,
          status: data.status,
          createdAt: data.created_at || data.updated_at
        }
      };
    }
  })
  .build();

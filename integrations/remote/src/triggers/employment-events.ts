import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let EMPLOYMENT_EVENTS = [
  'employment.onboarding.started',
  'employment.onboarding.completed',
  'employment.onboarding.cancelled',
  'employment.onboarding_task.completed',
  'employment.details.updated',
  'employment.personal_information.updated',
  'employment.status.changed',
  'employment.user_status.activated',
  'employment.user_status.deactivated',
  'employment.user_status.initiated',
  'employment.user_status.invited',
  'employment.start_date.changed',
  'employment.work_email.updated',
  'employment.agreement.available',
  'employment.account.updated'
];

export let employmentEvents = SlateTrigger.create(spec, {
  name: 'Employment Events',
  key: 'employment_events',
  description:
    'Triggered when employment-related events occur, including onboarding progress, status changes, personal information updates, and user activation/deactivation.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of employment event'),
      eventId: z.string().describe('Unique event identifier'),
      employmentId: z.string().describe('Employment ID affected by the event'),
      eventPayload: z.record(z.string(), z.any()).describe('Full event payload from Remote')
    })
  )
  .output(
    z.object({
      employmentId: z.string().describe('Employment ID affected by the event'),
      eventPayload: z.record(z.string(), z.any()).describe('Full event payload')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.auth.environment ?? 'production'
      });

      let result = await client.createWebhookCallback(
        ctx.input.webhookBaseUrl,
        EMPLOYMENT_EVENTS
      );
      let callback = result?.data ?? result?.webhook_callback ?? result;

      return {
        registrationDetails: {
          callbackId: callback?.id ?? callback?.webhook_callback_id,
          signingKey: callback?.signing_key
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.auth.environment ?? 'production'
      });

      await client.deleteWebhookCallback(ctx.input.registrationDetails.callbackId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let employmentId: string = data?.employment_id ?? data?.resource_id ?? '';
      let eventType: string = data?.event_type ?? '';
      let eventId: string =
        data?.event_id ?? data?.id ?? `${eventType}-${employmentId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            employmentId,
            eventPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          employmentId: ctx.input.employmentId,
          eventPayload: ctx.input.eventPayload
        }
      };
    }
  });

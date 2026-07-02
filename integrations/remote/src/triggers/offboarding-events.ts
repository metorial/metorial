import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let OFFBOARDING_EVENTS = [
  'offboarding.submitted',
  'offboarding.review_started',
  'offboarding.submitted_to_payroll',
  'offboarding.completed',
  'offboarding.deleted',
  'offboarding.contract_terminated'
];

export let offboardingEvents = SlateTrigger.create(spec, {
  name: 'Offboarding Events',
  key: 'offboarding_events',
  description:
    'Triggered when offboarding events occur, including submission, review, payroll submission, completion, deletion, and contract termination.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of offboarding event'),
      eventId: z.string().describe('Unique event identifier'),
      employmentId: z.string().describe('Employment ID related to the offboarding'),
      offboardingId: z.string().optional().describe('Offboarding request ID'),
      eventPayload: z.record(z.string(), z.any()).describe('Full event payload from Remote')
    })
  )
  .output(
    z.object({
      employmentId: z.string().describe('Employment ID related to the offboarding'),
      offboardingId: z.string().optional().describe('Offboarding request ID'),
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
        OFFBOARDING_EVENTS
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

      let employmentId: string = data?.employment_id ?? '';
      let offboardingId: string | undefined =
        data?.offboarding_id ?? data?.resource_id ?? undefined;
      let eventType: string = data?.event_type ?? '';
      let eventId: string =
        data?.event_id ??
        data?.id ??
        `${eventType}-${offboardingId ?? employmentId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            employmentId,
            offboardingId,
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
          offboardingId: ctx.input.offboardingId,
          eventPayload: ctx.input.eventPayload
        }
      };
    }
  });

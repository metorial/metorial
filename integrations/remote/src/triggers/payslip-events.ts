import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let PAYSLIP_EVENTS = ['payslip.released'];

export let payslipEvents = SlateTrigger.create(spec, {
  name: 'Payslip Events',
  key: 'payslip_events',
  description: 'Triggered when a payslip is released and available for an employee.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of payslip event'),
      eventId: z.string().describe('Unique event identifier'),
      employmentId: z.string().describe('Employment ID the payslip belongs to'),
      payslipId: z.string().optional().describe('Payslip ID'),
      eventPayload: z.record(z.string(), z.any()).describe('Full event payload from Remote')
    })
  )
  .output(
    z.object({
      employmentId: z.string().describe('Employment ID the payslip belongs to'),
      payslipId: z.string().optional().describe('Payslip ID'),
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
        PAYSLIP_EVENTS
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
      let payslipId: string | undefined = data?.payslip_id ?? data?.resource_id ?? undefined;
      let eventType: string = data?.event_type ?? 'payslip.released';
      let eventId: string =
        data?.event_id ??
        data?.id ??
        `${eventType}-${payslipId ?? employmentId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            employmentId,
            payslipId,
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
          payslipId: ctx.input.payslipId,
          eventPayload: ctx.input.eventPayload
        }
      };
    }
  });

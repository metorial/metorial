import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let COMPANY_EVENTS = [
  'company.activated',
  'company.archived',
  'company.manager.created',
  'company.manager.updated',
  'company.manager.deleted',
  'company.pricing_plan.updated',
  'billing_document.issued',
  'timesheet.submitted',
  'contract_amendment.submitted',
  'contract_amendment.review_started',
  'contract_amendment.done',
  'contract_amendment.canceled',
  'contract_amendment.deleted'
];

export let companyEvents = SlateTrigger.create(spec, {
  name: 'Company & Admin Events',
  key: 'company_events',
  description:
    'Triggered when company-level events occur, including company activation/archival, manager changes, billing documents, timesheet submissions, and contract amendment lifecycle events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of company event'),
      eventId: z.string().describe('Unique event identifier'),
      resourceId: z.string().optional().describe('ID of the affected resource'),
      eventPayload: z.record(z.string(), z.any()).describe('Full event payload from Remote')
    })
  )
  .output(
    z.object({
      resourceId: z.string().optional().describe('ID of the affected resource'),
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
        COMPANY_EVENTS
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

      let resourceId: string | undefined =
        data?.resource_id ?? data?.company_id ?? data?.employment_id ?? undefined;
      let eventType: string = data?.event_type ?? '';
      let eventId: string =
        data?.event_id ?? data?.id ?? `${eventType}-${resourceId ?? ''}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            resourceId,
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
          resourceId: ctx.input.resourceId,
          eventPayload: ctx.input.eventPayload
        }
      };
    }
  });

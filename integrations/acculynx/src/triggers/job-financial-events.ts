import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let FINANCIAL_TOPICS = [
  'job.financials.approvedValue_changed',
  'job.invoice_updated',
  'job.invoice_voided',
  'job.accounting.integration-status.current_changed'
];

export let jobFinancialEventsTrigger = SlateTrigger.create(spec, {
  name: 'Job Financial Events',
  key: 'job_financial_events',
  description:
    'Triggered when financial data changes on a job, including approved value changes, invoice updates/voids, and accounting integration status changes.'
})
  .input(
    z.object({
      topicName: z.string().describe('The webhook topic name'),
      eventId: z.string().describe('Unique event identifier'),
      jobId: z.string().optional().describe('ID of the affected job'),
      payload: z.record(z.string(), z.any()).describe('Raw event payload')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('ID of the affected job'),
      topicName: z.string().describe('The webhook topic that fired'),
      eventData: z.record(z.string(), z.any()).describe('Full event data from AccuLynx')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let subscription = await client.createSubscription({
        consumerUrl: ctx.input.webhookBaseUrl,
        techContact: 'webhooks@slates.dev',
        topicNames: FINANCIAL_TOPICS
      });

      return {
        registrationDetails: {
          subscriptionId: subscription.subscriptionId ?? subscription.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let subscriptionId = ctx.input.registrationDetails?.subscriptionId;
      if (subscriptionId) {
        await client.deleteSubscription(subscriptionId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => ({
        topicName:
          event.topicName ??
          event.topic ??
          event.type ??
          'job.financials.approvedValue_changed',
        eventId: event.eventId ?? event.id ?? crypto.randomUUID(),
        jobId: event.jobId ?? event.data?.jobId ?? event.data?.id,
        payload: event
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let topicName = ctx.input.topicName;
      let typeMap: Record<string, string> = {
        'job.financials.approvedValue_changed': 'job.approved_value.changed',
        'job.invoice_updated': 'job.invoice.updated',
        'job.invoice_voided': 'job.invoice.voided',
        'job.accounting.integration-status.current_changed': 'job.accounting_status.changed'
      };
      let type = typeMap[topicName] ?? 'job.financial.changed';

      return {
        type,
        id: ctx.input.eventId,
        output: {
          jobId: ctx.input.jobId,
          topicName,
          eventData: ctx.input.payload
        }
      };
    }
  })
  .build();

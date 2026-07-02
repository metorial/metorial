import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let JOB_CONTACT_TOPICS = ['job.primary.contact_changed', 'job.contacts.primary_changed'];

export let jobContactEventsTrigger = SlateTrigger.create(spec, {
  name: 'Job Contact Events',
  key: 'job_contact_events',
  description:
    'Triggered when the primary contact on a job is changed or when primary contact details are modified.'
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
        topicNames: JOB_CONTACT_TOPICS
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
          event.topicName ?? event.topic ?? event.type ?? 'job.primary.contact_changed',
        eventId: event.eventId ?? event.id ?? crypto.randomUUID(),
        jobId: event.jobId ?? event.data?.jobId ?? event.data?.id,
        payload: event
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let topicName = ctx.input.topicName;
      let type =
        topicName === 'job.contacts.primary_changed'
          ? 'job.contact_details.changed'
          : 'job.primary_contact.changed';

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

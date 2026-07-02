import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { WebhookClient } from '../lib/webhooks';
import { spec } from '../spec';

let EVENT_TYPES = [
  'job.created',
  'job.updated',
  'job.completed',
  'job.status_changed',
  'job.queued',
  'job.checked_in',
  'job.checked_out',
  'job.note_added',
  'job.photo_added',
  'job.video_added',
  'job.badge_added',
  'job.badge_removed',
  'job.invoice_sent',
  'job.invoice_paid',
  'job.quote_sent',
  'job.quote_accepted',
  'job.review_received'
] as const;

export let jobEvents = SlateTrigger.create(spec, {
  name: 'Job Events',
  key: 'job_events',
  description:
    'Triggers when job-level events occur in ServiceM8, such as job creation, completion, status changes, check-ins, invoicing, and quoting.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The type of job event (e.g. job.created, job.completed)'),
      eventPayload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      jobUuid: z.string().describe('UUID of the affected job'),
      eventName: z.string().describe('Name of the event that occurred'),
      generatedJobId: z.string().optional().describe('Human-readable job number'),
      status: z.string().optional().describe('Current job status'),
      description: z.string().optional().describe('Job description'),
      jobAddress: z.string().optional().describe('Job address'),
      companyUuid: z.string().optional().describe('UUID of the associated client'),
      totalPrice: z.string().optional().describe('Job total price'),
      editDate: z.string().optional().describe('Last modified timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let webhookClient = new WebhookClient({ token: ctx.auth.token });
      let registeredEvents: string[] = [];

      for (let event of EVENT_TYPES) {
        try {
          await webhookClient.subscribeEventWebhook({
            event,
            callbackUrl: ctx.input.webhookBaseUrl,
            uniqueId: `slates_job_events`
          });
          registeredEvents.push(event);
        } catch {
          // Some events may not be available for this account
        }
      }

      return {
        registrationDetails: { registeredEvents, callbackUrl: ctx.input.webhookBaseUrl }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let webhookClient = new WebhookClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        registeredEvents: string[];
        callbackUrl: string;
      };

      for (let event of details.registeredEvents) {
        try {
          await webhookClient.unsubscribeEventWebhook({
            event,
            callbackUrl: details.callbackUrl,
            uniqueId: `slates_job_events`
          });
        } catch {
          // Best effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Handle challenge verification for webhook registration
      if (body?.mode === 'subscribe' && body?.challenge) {
        return {
          inputs: [],
          response: new Response(body.challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
          })
        };
      }

      // Event webhooks deliver event data
      let eventName = body?.event || body?.eventName || 'job.updated';
      let jobUuid = body?.data?.uuid || body?.entry?.[0]?.uuid || body?.uuid || '';

      if (!jobUuid && body?.entry?.length > 0) {
        jobUuid = body.entry[0].uuid;
      }

      return {
        inputs: [
          {
            eventType: eventName,
            eventPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.eventPayload;
      let eventType = ctx.input.eventType;
      let jobUuid = payload?.data?.uuid || payload?.entry?.[0]?.uuid || payload?.uuid || '';

      // Fetch the full job details
      let job: any = {};
      if (jobUuid) {
        try {
          let client = new Client({ token: ctx.auth.token });
          job = await client.getJob(jobUuid);
        } catch {
          // Job may not be accessible
        }
      }

      return {
        type: eventType,
        id: `${eventType}_${jobUuid}_${payload?.entry?.[0]?.time || Date.now()}`,
        output: {
          jobUuid: job.uuid || jobUuid,
          eventName: eventType,
          generatedJobId: job.generated_job_id,
          status: job.status,
          description: job.description,
          jobAddress: job.job_address,
          companyUuid: job.company_uuid,
          totalPrice: job.total_price,
          editDate: job.edit_date
        }
      };
    }
  })
  .build();

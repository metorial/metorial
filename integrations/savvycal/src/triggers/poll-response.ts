import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let pollResponseOutputSchema = z.object({
  responseId: z.string().describe('Poll response identifier'),
  respondentName: z.string().describe('Name of the person who responded'),
  respondentEmail: z.string().describe('Email of the respondent'),
  respondentFirstName: z.string().optional().describe('First name'),
  respondentLastName: z.string().optional().describe('Last name'),
  respondentTimeZone: z.string().optional().describe('Respondent time zone'),
  respondentPhoneNumber: z.string().nullable().optional().describe('Phone number'),
  pollId: z.string().optional().describe('Poll identifier'),
  pollName: z.string().optional().describe('Poll name'),
  pollSlug: z.string().optional().describe('Poll URL slug'),
  slots: z
    .array(
      z.object({
        startAt: z.string().describe('Slot start time'),
        endAt: z.string().describe('Slot end time')
      })
    )
    .optional()
    .describe('Selected time slots'),
  createdAt: z.string().optional().describe('Response creation timestamp')
});

export let pollResponseTrigger = SlateTrigger.create(spec, {
  name: 'Poll Response',
  key: 'poll_response',
  description:
    'Triggers when someone creates or updates a response to a SavvyCal meeting poll.'
})
  .input(
    z.object({
      webhookEventType: z.string().describe('Webhook event type'),
      webhookEventId: z.string().describe('Webhook payload ID'),
      occurredAt: z.string().describe('When the event occurred'),
      responsePayload: z.any().describe('Raw poll response payload')
    })
  )
  .output(pollResponseOutputSchema)
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook({ url: ctx.input.webhookBaseUrl });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          secret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let pollTypes = ['poll.response.created', 'poll.response.updated'];

      if (!pollTypes.includes(data.type)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            webhookEventType: data.type,
            webhookEventId: data.id,
            occurredAt: data.occurred_at,
            responsePayload: data.payload
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let r = ctx.input.responsePayload;

      return {
        type: ctx.input.webhookEventType,
        id: ctx.input.webhookEventId,
        output: {
          responseId: r.id,
          respondentName: r.display_name,
          respondentEmail: r.email,
          respondentFirstName: r.first_name,
          respondentLastName: r.last_name,
          respondentTimeZone: r.time_zone,
          respondentPhoneNumber: r.phone_number,
          pollId: r.poll?.id,
          pollName: r.poll?.name,
          pollSlug: r.poll?.slug,
          slots: r.slots?.map((s: any) => ({
            startAt: s.start_at,
            endAt: s.end_at
          })),
          createdAt: r.created_at
        }
      };
    }
  })
  .build();

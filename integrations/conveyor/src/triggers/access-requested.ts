import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let accessRequested = SlateTrigger.create(spec, {
  name: 'Access Requested',
  key: 'access_requested',
  description:
    'Triggered when a user requests access to your Trust Center for the first time. Configure the webhook endpoint URL in Conveyor Webhook Preferences (https://app.conveyor.com/webhook-preferences).'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type from webhook payload'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      email: z.string().optional().describe('Email of the requester'),
      requestId: z.string().optional().describe('Authorization request ID'),
      rawPayload: z.any().describe('Full webhook event payload')
    })
  )
  .output(
    z.object({
      email: z.string().optional().describe('Email of the user requesting access'),
      requestId: z.string().optional().describe('Authorization request ID'),
      message: z.string().optional().describe('Message from the requester'),
      status: z.string().optional().describe('Request status'),
      dataroomId: z.string().optional().describe('ID of the Trust Center dataroom'),
      requestedAt: z.string().optional().describe('When the request was made'),
      crmLink: z.string().optional().describe('Link to the CRM record')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // Svix-powered webhooks may send the event in various formats
      // Handle both direct event payload and wrapped event envelope
      let eventType = data?.type || data?.event_type || 'access.requested';
      let eventId = data?.id || data?.event_id || `${Date.now()}`;
      let eventData = data?.data || data;

      return {
        inputs: [
          {
            eventType,
            eventId,
            email: eventData?.email,
            requestId: eventData?.id || eventData?.request_id,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload;
      let eventData = payload?.data || payload;

      return {
        type: 'access.requested',
        id: ctx.input.eventId,
        output: {
          email: ctx.input.email || eventData?.email,
          requestId: ctx.input.requestId || eventData?.id,
          message: eventData?.message,
          status: eventData?.status,
          dataroomId: eventData?.dataroom_id,
          requestedAt: eventData?.requested_at,
          crmLink: eventData?.crm_link
        }
      };
    }
  })
  .build();

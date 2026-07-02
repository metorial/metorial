import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ALL_MAIL_EVENT_TYPES = [
  'postcard.created',
  'postcard.rendered_pdf',
  'postcard.rendered_thumbnails',
  'postcard.deleted',
  'postcard.mailed',
  'postcard.in_transit',
  'postcard.in_local_area',
  'postcard.processed_for_delivery',
  'postcard.re-routed',
  'postcard.returned_to_sender',
  'postcard.delivered',
  'postcard.international_exit',
  'postcard.failed',
  'postcard.viewed',
  'letter.created',
  'letter.rendered_pdf',
  'letter.rendered_thumbnails',
  'letter.deleted',
  'letter.mailed',
  'letter.in_transit',
  'letter.in_local_area',
  'letter.processed_for_delivery',
  'letter.re-routed',
  'letter.returned_to_sender',
  'letter.delivered',
  'letter.failed',
  'letter.viewed',
  'letter.certified.mailed',
  'letter.certified.in_transit',
  'letter.certified.in_local_area',
  'letter.certified.processed_for_delivery',
  'letter.certified.delivered',
  'letter.certified.pickup_available',
  'letter.certified.re-routed',
  'letter.certified.returned_to_sender',
  'letter.certified.issue',
  'letter.return_envelope.created',
  'letter.return_envelope.in_transit',
  'letter.return_envelope.in_local_area',
  'letter.return_envelope.processed_for_delivery',
  'letter.return_envelope.re-routed',
  'letter.return_envelope.returned_to_sender',
  'self_mailer.created',
  'self_mailer.rendered_pdf',
  'self_mailer.rendered_thumbnails',
  'self_mailer.deleted',
  'self_mailer.mailed',
  'self_mailer.in_transit',
  'self_mailer.in_local_area',
  'self_mailer.processed_for_delivery',
  'self_mailer.re-routed',
  'self_mailer.returned_to_sender',
  'self_mailer.delivered',
  'self_mailer.international_exit',
  'self_mailer.failed',
  'self_mailer.viewed',
  'check.created',
  'check.rendered_pdf',
  'check.rendered_thumbnails',
  'check.deleted',
  'check.mailed',
  'check.in_transit',
  'check.in_local_area',
  'check.processed_for_delivery',
  'check.re-routed',
  'check.returned_to_sender',
  'check.delivered',
  'check.failed',
  'address.created',
  'address.deleted',
  'bank_account.created',
  'bank_account.deleted',
  'bank_account.verified'
];

export let mailEvents = SlateTrigger.create(spec, {
  name: 'Mail & Resource Events',
  key: 'mail_events',
  description:
    'Receive real-time webhook notifications for mail piece lifecycle events (postcards, letters, self-mailers, checks), USPS tracking updates, address events, and bank account events.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Lob event type (e.g., "postcard.delivered", "letter.created")'),
      eventId: z.string().describe('Unique event ID'),
      resourceId: z.string().describe('ID of the affected resource'),
      resourceType: z
        .string()
        .describe(
          'Type of resource (postcard, letter, self_mailer, check, address, bank_account)'
        ),
      dateCreated: z.string().describe('When the event was created'),
      body: z.any().describe('Full event body from Lob')
    })
  )
  .output(
    z.object({
      resourceId: z
        .string()
        .describe('ID of the affected resource (e.g., postcard ID, letter ID)'),
      resourceType: z
        .string()
        .describe(
          'Type of resource: postcard, letter, self_mailer, check, address, bank_account'
        ),
      eventType: z
        .string()
        .describe('Specific event type (e.g., "delivered", "in_transit", "created")'),
      description: z
        .string()
        .optional()
        .nullable()
        .describe('Resource description if available'),
      status: z.string().optional().nullable().describe('Current status of the resource'),
      url: z.string().optional().nullable().describe('PDF preview URL if available'),
      to: z.any().optional().nullable().describe('Recipient address if applicable'),
      from: z.any().optional().nullable().describe('Sender address if applicable'),
      trackingEvents: z
        .array(z.any())
        .optional()
        .nullable()
        .describe('Latest tracking events if available'),
      dateCreated: z.string().describe('When the event occurred'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .nullable()
        .describe('Resource metadata'),
      rawResource: z.any().describe('Complete resource object from Lob')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        eventTypes: ALL_MAIL_EVENT_TYPES.map(id => ({ id })),
        description: 'Slates integration webhook'
      });
      return {
        registrationDetails: {
          webhookId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // Lob sends the event object directly
      let eventType = data.event_type?.id ?? data.event_type ?? '';
      let resourceBody = data.body ?? {};
      let resourceId = resourceBody.id ?? '';
      let resourceType = '';

      if (eventType.startsWith('postcard.')) resourceType = 'postcard';
      else if (eventType.startsWith('letter.')) resourceType = 'letter';
      else if (eventType.startsWith('self_mailer.')) resourceType = 'self_mailer';
      else if (eventType.startsWith('check.')) resourceType = 'check';
      else if (eventType.startsWith('address.')) resourceType = 'address';
      else if (eventType.startsWith('bank_account.')) resourceType = 'bank_account';

      return {
        inputs: [
          {
            eventType,
            eventId: data.id ?? `${resourceId}_${eventType}_${Date.now()}`,
            resourceId,
            resourceType,
            dateCreated: data.date_created ?? new Date().toISOString(),
            body: resourceBody
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let resource = ctx.input.body;
      let shortEventType = ctx.input.eventType;

      return {
        type: shortEventType,
        id: ctx.input.eventId,
        output: {
          resourceId: ctx.input.resourceId,
          resourceType: ctx.input.resourceType,
          eventType: shortEventType.includes('.')
            ? shortEventType.split('.').slice(1).join('.')
            : shortEventType,
          description: resource.description ?? null,
          status: resource.status ?? null,
          url: resource.url ?? null,
          to: resource.to ?? null,
          from: resource.from ?? null,
          trackingEvents: resource.tracking_events ?? null,
          dateCreated: ctx.input.dateCreated,
          metadata: resource.metadata ?? null,
          rawResource: resource
        }
      };
    }
  });

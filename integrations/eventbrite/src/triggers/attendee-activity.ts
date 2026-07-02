import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let attendeeActivity = SlateTrigger.create(spec, {
  name: 'Attendee Activity',
  key: 'attendee_activity',
  description:
    'Triggered when an attendee is updated, checked in, or checked out at an Eventbrite event.'
})
  .input(
    z.object({
      action: z
        .string()
        .describe('The webhook action (e.g., "attendee.updated", "barcode.checked_in").'),
      apiUrl: z.string().describe('The API URL to fetch the full attendee resource.')
    })
  )
  .output(
    z.object({
      attendeeId: z.string().describe('The unique attendee ID.'),
      orderId: z.string().optional().describe('The associated order ID.'),
      eventId: z.string().optional().describe('The event ID.'),
      ticketClassName: z.string().optional().describe('Name of the ticket class.'),
      ticketClassId: z.string().optional().describe('ID of the ticket class.'),
      firstName: z.string().optional().describe('Attendee first name.'),
      lastName: z.string().optional().describe('Attendee last name.'),
      email: z.string().optional().describe('Attendee email.'),
      status: z.string().optional().describe('Attendee status.'),
      checkedIn: z
        .boolean()
        .optional()
        .describe('Whether the attendee is currently checked in.'),
      created: z.string().optional().describe('When the attendee record was created.'),
      changed: z.string().optional().describe('When the attendee record was last changed.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      if (!ctx.config.organizationId) {
        throw new Error('Organization ID is required in config to register webhooks.');
      }

      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook(ctx.config.organizationId, {
        endpoint_url: ctx.input.webhookBaseUrl,
        actions: 'attendee.updated,barcode.checked_in,barcode.un_checked_in'
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            action: body.config?.action || 'attendee.updated',
            apiUrl: body.api_url || ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let { eventId, attendeeId } = extractIdsFromUrl(ctx.input.apiUrl);
      let attendee: any = {};

      if (eventId && attendeeId) {
        try {
          attendee = await client.getAttendee(eventId, attendeeId);
        } catch (_e) {
          attendee = { id: attendeeId, event_id: eventId };
        }
      }

      let actionType = mapActionType(ctx.input.action);

      return {
        type: actionType,
        id: `${actionType}-${attendee.id || attendeeId || Date.now()}`,
        output: {
          attendeeId: attendee.id || attendeeId || '',
          orderId: attendee.order_id,
          eventId: attendee.event_id || eventId,
          ticketClassName: attendee.ticket_class_name,
          ticketClassId: attendee.ticket_class_id,
          firstName: attendee.profile?.first_name,
          lastName: attendee.profile?.last_name,
          email: attendee.profile?.email,
          status: attendee.status,
          checkedIn: attendee.checked_in,
          created: attendee.created,
          changed: attendee.changed
        }
      };
    }
  })
  .build();

let extractIdsFromUrl = (
  apiUrl: string
): { eventId: string | null; attendeeId: string | null } => {
  let eventMatch = apiUrl.match(/\/events\/(\d+)\//);
  let attendeeMatch = apiUrl.match(/\/attendees\/(\d+)\//);
  return {
    eventId: eventMatch?.[1] ?? null,
    attendeeId: attendeeMatch?.[1] ?? null
  };
};

let mapActionType = (action: string): string => {
  switch (action) {
    case 'barcode.checked_in':
      return 'attendee.checked_in';
    case 'barcode.un_checked_in':
      return 'attendee.checked_out';
    default:
      return action;
  }
};

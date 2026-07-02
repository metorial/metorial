import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { RESERVATION_EVENTS } from '../lib/webhook-events';
import { spec } from '../spec';

export let reservationEvents = SlateTrigger.create(spec, {
  name: 'Reservation Events',
  key: 'reservation_events',
  description:
    'Triggers on reservation lifecycle events including creation, confirmation, cancellation, modification, check-in/out, no-show, and price updates.'
})
  .input(
    z.object({
      notificationType: z.string().describe('Planyo event code'),
      reservationId: z.string().describe('Reservation ID'),
      resourceId: z.string().optional().describe('Resource ID'),
      resourceName: z.string().optional().describe('Resource name'),
      siteId: z.string().optional().describe('Site ID'),
      startTime: z.string().optional().describe('Reservation start timestamp'),
      endTime: z.string().optional().describe('Reservation end timestamp'),
      userId: z.string().optional().describe('Customer user ID'),
      email: z.string().optional().describe('Customer email'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      quantity: z.number().optional().describe('Quantity reserved'),
      status: z.string().optional().describe('Current reservation status'),
      totalPrice: z.string().optional().describe('Quoted price'),
      amountPaid: z.string().optional().describe('Amount already paid'),
      currency: z.string().optional().describe('Currency code'),
      rawPayload: z.any().optional().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      reservationId: z.string().describe('Reservation ID'),
      resourceId: z.string().optional().describe('Resource ID'),
      resourceName: z.string().optional().describe('Resource name'),
      siteId: z.string().optional().describe('Site ID'),
      startTime: z.string().optional().describe('Reservation start timestamp'),
      endTime: z.string().optional().describe('Reservation end timestamp'),
      userId: z.string().optional().describe('Customer user ID'),
      email: z.string().optional().describe('Customer email'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      quantity: z.number().optional().describe('Quantity reserved'),
      status: z.string().optional().describe('Current reservation status'),
      totalPrice: z.string().optional().describe('Quoted price'),
      amountPaid: z.string().optional().describe('Amount already paid'),
      amountOutstanding: z.string().optional().describe('Remaining balance'),
      currency: z.string().optional().describe('Currency code'),
      creationDate: z.string().optional().describe('Creation timestamp'),
      cartId: z.string().optional().describe('Shopping cart ID'),
      unitAssignment: z.string().optional().describe('Assigned unit name'),
      userNotes: z.string().optional().describe('Customer notes'),
      adminNotes: z.string().optional().describe('Admin notes'),
      isCustomerTriggered: z
        .boolean()
        .optional()
        .describe('Whether the event was triggered by the customer'),
      previousStatus: z
        .string()
        .optional()
        .describe('Previous status (for cancellation events)'),
      confirmationMethod: z
        .string()
        .optional()
        .describe('Confirmation method (for confirmation events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PlanyoClient(ctx.auth, ctx.config);
      let webhookUrl = `${ctx.input.webhookBaseUrl}?ppp_payload=json`;

      let registeredEvents: string[] = [];
      for (let eventCode of RESERVATION_EVENTS) {
        try {
          await client.addNotificationCallback(eventCode, webhookUrl);
          registeredEvents.push(eventCode);
        } catch (_e) {
          // Some events may not be available; continue with the rest
        }
      }

      return {
        registrationDetails: {
          webhookUrl,
          registeredEvents
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new PlanyoClient(ctx.auth, ctx.config);
      let details = ctx.input.registrationDetails as {
        webhookUrl: string;
        registeredEvents: string[];
      };

      for (let eventCode of details.registeredEvents) {
        try {
          await client.removeNotificationCallback(eventCode, details.webhookUrl);
        } catch (_e) {
          // Best effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data: Record<string, any>;
      let contentType = ctx.request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        data = (await ctx.request.json()) as Record<string, any>;
      } else {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        data = Object.fromEntries(params.entries());
      }

      let notificationType = data.notification_type || '';
      let reservationId = data.reservation ? String(data.reservation) : '';

      if (!reservationId) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            notificationType,
            reservationId,
            resourceId: data.resource ? String(data.resource) : undefined,
            resourceName: data.resource_name,
            siteId: data.calendar ? String(data.calendar) : undefined,
            startTime: data.start ? String(data.start) : undefined,
            endTime: data.end ? String(data.end) : undefined,
            userId: data.user_id
              ? String(data.user_id)
              : data.user
                ? String(data.user)
                : undefined,
            email: data.email,
            firstName: data.first_name,
            lastName: data.last_name,
            quantity: data.count != null ? Number(data.count) : undefined,
            status: data.status ? String(data.status) : undefined,
            totalPrice: data.price_quoted ? String(data.price_quoted) : undefined,
            amountPaid: data.amount_paid ? String(data.amount_paid) : undefined,
            currency: data.currency,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;
      let raw = input.rawPayload || {};

      return {
        type: `reservation.${input.notificationType}`,
        id: `${input.reservationId}-${input.notificationType}-${raw.creation_date || Date.now()}`,
        output: {
          reservationId: input.reservationId,
          resourceId: input.resourceId,
          resourceName: input.resourceName,
          siteId: input.siteId,
          startTime: input.startTime,
          endTime: input.endTime,
          userId: input.userId,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          quantity: input.quantity,
          status: input.status,
          totalPrice: input.totalPrice,
          amountPaid: input.amountPaid,
          amountOutstanding: raw.amount_outstanding
            ? String(raw.amount_outstanding)
            : undefined,
          currency: input.currency,
          creationDate: raw.creation_date ? String(raw.creation_date) : undefined,
          cartId: raw.cart_id ? String(raw.cart_id) : undefined,
          unitAssignment: raw.unit_assignment,
          userNotes: raw.user_notes,
          adminNotes: raw.admin_notes,
          isCustomerTriggered:
            raw.is_event_fired_by_customer === '1' || raw.is_event_fired_by_customer === 1,
          previousStatus: raw.prev_status ? String(raw.prev_status) : undefined,
          confirmationMethod: raw.confirmation_method
        }
      };
    }
  })
  .build();

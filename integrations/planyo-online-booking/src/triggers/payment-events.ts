import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { PAYMENT_EVENTS } from '../lib/webhook-events';
import { spec } from '../spec';

export let paymentEvents = SlateTrigger.create(spec, {
  name: 'Payment Events',
  key: 'payment_events',
  description: 'Triggers when payments are received or removed for reservations and coupons.'
})
  .input(
    z.object({
      notificationType: z.string().describe('Planyo event code'),
      reservationId: z
        .string()
        .optional()
        .describe('Reservation ID (for reservation payments)'),
      resourceId: z.string().optional().describe('Resource ID'),
      userId: z.string().optional().describe('User ID'),
      email: z.string().optional().describe('Customer email'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      paymentAmount: z.string().optional().describe('Payment amount'),
      paymentMode: z.string().optional().describe('Payment method'),
      paymentTime: z.string().optional().describe('Payment timestamp'),
      currency: z.string().optional().describe('Currency code'),
      rawPayload: z.any().optional().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      reservationId: z.string().optional().describe('Reservation ID'),
      resourceId: z.string().optional().describe('Resource ID'),
      userId: z.string().optional().describe('User ID'),
      email: z.string().optional().describe('Customer email'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      paymentAmount: z.string().optional().describe('Payment amount'),
      paymentMode: z.string().optional().describe('Payment method'),
      paymentTime: z.string().optional().describe('Payment timestamp'),
      currency: z.string().optional().describe('Currency code'),
      totalPrice: z.string().optional().describe('Reservation total price'),
      amountPaid: z.string().optional().describe('Total amount paid'),
      amountOutstanding: z.string().optional().describe('Remaining balance'),
      couponCode: z.string().optional().describe('Coupon code (for coupon payments)'),
      couponBalance: z.string().optional().describe('Coupon remaining balance')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PlanyoClient(ctx.auth, ctx.config);
      let webhookUrl = `${ctx.input.webhookBaseUrl}?ppp_payload=json`;

      let registeredEvents: string[] = [];
      for (let eventCode of PAYMENT_EVENTS) {
        try {
          await client.addNotificationCallback(eventCode, webhookUrl);
          registeredEvents.push(eventCode);
        } catch (_e) {
          // Continue on failure
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
          // Best effort
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

      return {
        inputs: [
          {
            notificationType,
            reservationId: data.reservation ? String(data.reservation) : undefined,
            resourceId: data.resource ? String(data.resource) : undefined,
            userId: data.user_id
              ? String(data.user_id)
              : data.user
                ? String(data.user)
                : undefined,
            email: data.email,
            firstName: data.first_name,
            lastName: data.last_name,
            paymentAmount: data.payment_amount ? String(data.payment_amount) : undefined,
            paymentMode: data.payment_mode ? String(data.payment_mode) : undefined,
            paymentTime: data.payment_time ? String(data.payment_time) : undefined,
            currency: data.currency,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;
      let raw = input.rawPayload || {};

      let eventId = `${input.notificationType}-${input.reservationId || 'coupon'}-${input.paymentTime || Date.now()}`;

      return {
        type: `payment.${input.notificationType}`,
        id: eventId,
        output: {
          reservationId: input.reservationId,
          resourceId: input.resourceId,
          userId: input.userId,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          paymentAmount: input.paymentAmount,
          paymentMode: input.paymentMode,
          paymentTime: input.paymentTime,
          currency: input.currency,
          totalPrice: raw.price_quoted ? String(raw.price_quoted) : undefined,
          amountPaid: raw.amount_paid ? String(raw.amount_paid) : undefined,
          amountOutstanding: raw.amount_outstanding
            ? String(raw.amount_outstanding)
            : undefined,
          couponCode: raw.coupon_code,
          couponBalance: raw.coupon_balance ? String(raw.coupon_balance) : undefined
        }
      };
    }
  })
  .build();

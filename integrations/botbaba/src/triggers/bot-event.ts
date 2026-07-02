import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let botEvent = SlateTrigger.create(spec, {
  name: 'Bot Event',
  key: 'bot_event',
  description: `Receives webhook events from Botbaba when bot-related events occur. Supports payment success, payment failure, chat complete, chat incomplete, and cart abandon events. Configure the webhook URL in the Botbaba dashboard under your bot's trigger-and-action settings using the HTTP Request action.`
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of the event (e.g., payment_success, payment_failed, chat_complete, chat_incomplete, cart_abandon)'
        ),
      eventId: z.string().describe('Unique identifier for the event'),
      botId: z.string().optional().describe('Bot ID associated with the event'),
      chatId: z.string().optional().describe('Chat session ID'),
      payload: z.record(z.string(), z.unknown()).describe('Full event payload from Botbaba')
    })
  )
  .output(
    z.object({
      botId: z.string().optional().describe('Bot ID associated with the event'),
      chatId: z.string().optional().describe('Chat session ID'),
      mobileNumber: z.string().optional().describe('User mobile number if available'),
      userName: z.string().optional().describe('User name if available'),
      email: z.string().optional().describe('User email if available'),
      cartTotal: z.number().optional().describe('Cart total amount for cart/payment events'),
      currency: z.string().optional().describe('Currency code for payment events'),
      paymentStatus: z.string().optional().describe('Payment status (success or failed)'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .describe('Complete raw event payload from Botbaba')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: Record<string, unknown>;

      try {
        data = (await ctx.request.json()) as Record<string, unknown>;
      } catch {
        let text = await ctx.request.text();
        data = { raw: text };
      }

      let eventType = (data.event_type ?? data.eventType ?? data.type ?? 'unknown') as string;
      let normalizedType = String(eventType)
        .toLowerCase()
        .replace(/[\s-]+/g, '_');

      let eventId = (data.event_id ??
        data.eventId ??
        data.id ??
        `${normalizedType}_${Date.now()}`) as string;
      let botId = (data.bot_id ?? data.botId) as string | undefined;
      let chatId = (data.chat_id ?? data.chatId ?? data.session_id ?? data.sessionId) as
        | string
        | undefined;

      return {
        inputs: [
          {
            eventType: normalizedType,
            eventId: String(eventId),
            botId,
            chatId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload;

      let mobileNumber = (payload.mobile ??
        payload.mobileNumber ??
        payload.phone ??
        payload.mobile_number) as string | undefined;
      let userName = (payload.name ??
        payload.userName ??
        payload.user_name ??
        payload.customer_name) as string | undefined;
      let email = (payload.email ?? payload.user_email ?? payload.customer_email) as
        | string
        | undefined;
      let cartTotal = (payload.cart_total ??
        payload.cartTotal ??
        payload.amount ??
        payload.total) as number | undefined;
      let currency = (payload.currency ?? payload.currency_code) as string | undefined;

      let paymentStatus: string | undefined;
      if (ctx.input.eventType.includes('payment_success')) {
        paymentStatus = 'success';
      } else if (ctx.input.eventType.includes('payment_failed')) {
        paymentStatus = 'failed';
      }

      return {
        type: `bot.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          botId: ctx.input.botId,
          chatId: ctx.input.chatId,
          mobileNumber: mobileNumber ? String(mobileNumber) : undefined,
          userName: userName ? String(userName) : undefined,
          email: email ? String(email) : undefined,
          cartTotal: cartTotal !== undefined ? Number(cartTotal) : undefined,
          currency: currency ? String(currency) : undefined,
          paymentStatus,
          rawPayload: ctx.input.payload
        }
      };
    }
  })
  .build();

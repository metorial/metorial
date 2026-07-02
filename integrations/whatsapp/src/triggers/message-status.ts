import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let messageStatus = SlateTrigger.create(spec, {
  name: 'Message Status Update',
  key: 'message_status',
  description:
    'Triggers when the delivery status of a sent message changes. Statuses progress through: sent, delivered, read, or failed.'
})
  .input(
    z.object({
      statusId: z.string().describe('Unique status entry identifier'),
      messageId: z.string().describe('Message ID this status refers to'),
      status: z.string().describe('Message status (sent, delivered, read, failed)'),
      timestamp: z.string().describe('Status timestamp'),
      recipientId: z.string().describe('Recipient phone number'),
      phoneNumberId: z.string().describe('Sending phone number ID'),
      displayPhoneNumber: z.string().optional().describe('Sending display phone number'),
      conversationId: z.string().optional().describe('Conversation ID'),
      conversationOriginType: z.string().optional().describe('Conversation origin type'),
      pricingBillable: z.boolean().optional().describe('Whether this message is billable'),
      pricingCategory: z.string().optional().describe('Pricing category'),
      errors: z.any().optional().describe('Error details if status is failed')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Message ID this status refers to'),
      status: z.string().describe('Message status (sent, delivered, read, failed)'),
      timestamp: z.string().describe('Status change timestamp (Unix epoch)'),
      recipientId: z.string().describe('Recipient phone number'),
      phoneNumberId: z.string().describe('Sending phone number ID'),
      displayPhoneNumber: z.string().optional().describe('Sending display phone number'),
      conversationId: z.string().optional().describe('Conversation ID'),
      conversationOriginType: z
        .string()
        .optional()
        .describe(
          'Origin of the conversation (business_initiated, user_initiated, referral_conversion, etc.)'
        ),
      pricingBillable: z.boolean().optional().describe('Whether this message is billable'),
      pricingCategory: z.string().optional().describe('Pricing category'),
      errorCode: z.string().optional().describe('Error code (when status is failed)'),
      errorTitle: z.string().optional().describe('Error title (when status is failed)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let method = ctx.request.method;

      // Handle webhook verification GET request
      if (method === 'GET') {
        let url = new URL(ctx.request.url);
        let mode = url.searchParams.get('hub.mode');
        let challenge = url.searchParams.get('hub.challenge');

        if (mode === 'subscribe' && challenge) {
          return {
            inputs: [],
            response: new Response(challenge, {
              status: 200,
              headers: { 'Content-Type': 'text/plain' }
            })
          };
        }
        return { inputs: [], response: new Response('Bad request', { status: 400 }) };
      }

      let body = (await ctx.request.json()) as any;

      if (body.object !== 'whatsapp_business_account') {
        return { inputs: [] };
      }

      let inputs: any[] = [];

      for (let entry of body.entry ?? []) {
        for (let change of entry.changes ?? []) {
          if (change.field !== 'messages') continue;

          let value = change.value;
          let metadata = value?.metadata ?? {};
          let statuses = value?.statuses ?? [];

          for (let statusEntry of statuses) {
            inputs.push({
              statusId: `${statusEntry.id}_${statusEntry.status}_${statusEntry.timestamp}`,
              messageId: statusEntry.id,
              status: statusEntry.status,
              timestamp: statusEntry.timestamp,
              recipientId: statusEntry.recipient_id,
              phoneNumberId: metadata.phone_number_id,
              displayPhoneNumber: metadata.display_phone_number,
              conversationId: statusEntry.conversation?.id,
              conversationOriginType: statusEntry.conversation?.origin?.type,
              pricingBillable: statusEntry.pricing?.billable,
              pricingCategory: statusEntry.pricing?.category,
              errors: statusEntry.errors
            });
          }
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let errorCode: string | undefined;
      let errorTitle: string | undefined;

      if (ctx.input.errors && Array.isArray(ctx.input.errors) && ctx.input.errors.length > 0) {
        errorCode = String(ctx.input.errors[0].code);
        errorTitle = ctx.input.errors[0].title;
      }

      return {
        type: `message_status.${ctx.input.status}`,
        id: ctx.input.statusId,
        output: {
          messageId: ctx.input.messageId,
          status: ctx.input.status,
          timestamp: ctx.input.timestamp,
          recipientId: ctx.input.recipientId,
          phoneNumberId: ctx.input.phoneNumberId,
          displayPhoneNumber: ctx.input.displayPhoneNumber,
          conversationId: ctx.input.conversationId,
          conversationOriginType: ctx.input.conversationOriginType,
          pricingBillable: ctx.input.pricingBillable,
          pricingCategory: ctx.input.pricingCategory,
          errorCode,
          errorTitle
        }
      };
    }
  })
  .build();

import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { parseFormUrlEncoded } from '../lib/webhook-parser';
import { spec } from '../spec';

export let messageStatus = SlateTrigger.create(spec, {
  name: 'Message Status Update',
  key: 'message_status',
  description:
    'Triggered when a message delivery status changes (e.g. queued, sent, delivered, failed, undelivered, read). Configure the status callback URL on individual messages or on your Messaging Service.'
})
  .input(
    z.object({
      messageSid: z.string().describe('SID of the message'),
      messageStatus: z.string().describe('New message status'),
      from: z.string().describe('Sender phone number'),
      to: z.string().describe('Recipient phone number'),
      accountSid: z.string().describe('Account SID'),
      errorCode: z.string().optional().describe('Error code if message failed'),
      errorMessage: z.string().optional().describe('Error message if message failed')
    })
  )
  .output(
    z.object({
      messageSid: z.string().describe('SID of the message'),
      status: z
        .string()
        .describe(
          'New delivery status (queued, sending, sent, delivered, undelivered, failed, read)'
        ),
      from: z.string().describe('Sender phone number'),
      to: z.string().describe('Recipient phone number'),
      errorCode: z
        .string()
        .nullable()
        .describe('Error code if message failed or was undelivered'),
      errorMessage: z.string().nullable().describe('Error message description')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let text = await ctx.request.text();
      let data = parseFormUrlEncoded(text);

      return {
        inputs: [
          {
            messageSid: data.MessageSid || data.SmsSid || '',
            messageStatus: data.MessageStatus || data.SmsStatus || '',
            from: data.From || '',
            to: data.To || '',
            accountSid: data.AccountSid || '',
            errorCode: data.ErrorCode,
            errorMessage: data.ErrorMessage
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `message.${ctx.input.messageStatus}`,
        id: `${ctx.input.messageSid}_${ctx.input.messageStatus}`,
        output: {
          messageSid: ctx.input.messageSid,
          status: ctx.input.messageStatus,
          from: ctx.input.from,
          to: ctx.input.to,
          errorCode: ctx.input.errorCode || null,
          errorMessage: ctx.input.errorMessage || null
        }
      };
    }
  })
  .build();

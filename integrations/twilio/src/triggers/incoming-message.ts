import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { parseFormUrlEncoded } from '../lib/webhook-parser';
import { spec } from '../spec';

export let incomingMessage = SlateTrigger.create(spec, {
  name: 'Incoming Message',
  key: 'incoming_message',
  description:
    'Triggered when an SMS, MMS, or WhatsApp message is received on a Twilio phone number. Configure the webhook URL on your Twilio phone number or Messaging Service to point to the provided webhook URL.'
})
  .input(
    z.object({
      messageSid: z.string().describe('Unique SID of the incoming message'),
      from: z.string().describe('Sender phone number'),
      to: z.string().describe('Your Twilio phone number that received the message'),
      body: z.string().describe('Text body of the message'),
      numMedia: z.string().describe('Number of media attachments'),
      fromCity: z.string().optional().describe('Sender city'),
      fromState: z.string().optional().describe('Sender state'),
      fromCountry: z.string().optional().describe('Sender country'),
      accountSid: z.string().describe('Account SID'),
      mediaUrls: z.array(z.string()).optional().describe('URLs of media attachments'),
      mediaContentTypes: z
        .array(z.string())
        .optional()
        .describe('MIME types of media attachments')
    })
  )
  .output(
    z.object({
      messageSid: z.string().describe('Unique SID of the incoming message'),
      from: z.string().describe('Sender phone number'),
      to: z.string().describe('Your Twilio phone number'),
      body: z.string().describe('Text body of the message'),
      numMedia: z.number().describe('Number of media attachments'),
      mediaUrls: z.array(z.string()).describe('URLs of media attachments'),
      mediaContentTypes: z.array(z.string()).describe('MIME types of media attachments'),
      fromCity: z.string().nullable().describe('Sender city'),
      fromState: z.string().nullable().describe('Sender state'),
      fromCountry: z.string().nullable().describe('Sender country')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let text = await ctx.request.text();
      let data = parseFormUrlEncoded(text);

      let numMedia = Number.parseInt(data.NumMedia || '0', 10);
      let mediaUrls: string[] = [];
      let mediaContentTypes: string[] = [];

      for (let i = 0; i < numMedia; i++) {
        if (data[`MediaUrl${i}`]) mediaUrls.push(data[`MediaUrl${i}`]!);
        if (data[`MediaContentType${i}`])
          mediaContentTypes.push(data[`MediaContentType${i}`]!);
      }

      return {
        inputs: [
          {
            messageSid: data.MessageSid || data.SmsSid || '',
            from: data.From || '',
            to: data.To || '',
            body: data.Body || '',
            numMedia: data.NumMedia || '0',
            fromCity: data.FromCity,
            fromState: data.FromState,
            fromCountry: data.FromCountry,
            accountSid: data.AccountSid || '',
            mediaUrls,
            mediaContentTypes
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'message.received',
        id: ctx.input.messageSid,
        output: {
          messageSid: ctx.input.messageSid,
          from: ctx.input.from,
          to: ctx.input.to,
          body: ctx.input.body,
          numMedia: Number.parseInt(ctx.input.numMedia, 10),
          mediaUrls: ctx.input.mediaUrls || [],
          mediaContentTypes: ctx.input.mediaContentTypes || [],
          fromCity: ctx.input.fromCity || null,
          fromState: ctx.input.fromState || null,
          fromCountry: ctx.input.fromCountry || null
        }
      };
    }
  })
  .build();

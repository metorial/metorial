import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwilioClient } from '../lib/client';
import { twilioServiceError } from '../lib/errors';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send an SMS, MMS, or WhatsApp message to a phone number. Supports sending text messages, media attachments, and scheduled messages. Use a **From** number or a **Messaging Service SID** to send. Scheduled messages require a Messaging Service SID.`,
  instructions: [
    'Either "from" or "messagingServiceSid" must be provided.',
    'For MMS, include one or more media URLs in "mediaUrls".',
    'For WhatsApp, prefix the "to" and "from" numbers with "whatsapp:", e.g. "whatsapp:+15551234567".',
    'To schedule a message, set "sendAt" to an ISO 8601 datetime and provide "messagingServiceSid".'
  ],
  constraints: [
    'Message body can be up to 1600 characters.',
    'Up to 10 media URLs per MMS message.',
    'Scheduled messages must use a Messaging Service SID and be between 15 minutes and 35 days in the future.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: z
        .string()
        .describe(
          'Destination phone number in E.164 format (e.g. +15551234567). For WhatsApp, prefix with "whatsapp:".'
        ),
      from: z
        .string()
        .optional()
        .describe(
          'Twilio phone number to send from in E.164 format. Required if messagingServiceSid is not provided.'
        ),
      body: z
        .string()
        .optional()
        .describe(
          'Text body of the message (up to 1600 characters). Required unless mediaUrls are provided.'
        ),
      messagingServiceSid: z
        .string()
        .optional()
        .describe(
          'SID of the Messaging Service to use (starts with MG). Required for scheduled messages.'
        ),
      mediaUrls: z
        .array(z.string())
        .optional()
        .describe('URLs of media to include (for MMS). Up to 10 URLs.'),
      contentSid: z
        .string()
        .optional()
        .describe('Twilio Content Template SID (starts with HX) to send templated content.'),
      contentVariables: z
        .string()
        .optional()
        .describe('JSON string of template variable substitutions for contentSid.'),
      shortenUrls: z
        .boolean()
        .optional()
        .describe(
          'Shorten links in the body. Requires a Messaging Service with Link Shortening.'
        ),
      sendAsMms: z
        .boolean()
        .optional()
        .describe('Send the message as MMS even if only body text is provided.'),
      statusCallbackUrl: z
        .string()
        .optional()
        .describe('URL to receive delivery status webhooks for this message.'),
      sendAt: z
        .string()
        .optional()
        .describe(
          'ISO 8601 datetime to schedule the message for future delivery. Requires messagingServiceSid.'
        )
    })
  )
  .output(
    z.object({
      messageSid: z.string().describe('Unique SID of the created message'),
      status: z
        .string()
        .describe(
          'Current status of the message (e.g. queued, sending, sent, delivered, scheduled)'
        ),
      to: z.string().describe('Recipient phone number'),
      from: z.string().nullable().describe('Sender phone number'),
      body: z.string().nullable().describe('Message body text'),
      numSegments: z.string().describe('Number of SMS segments'),
      numMedia: z.string().describe('Number of media attachments'),
      direction: z.string().describe('Message direction'),
      price: z.string().nullable().describe('Price of the message'),
      priceUnit: z.string().nullable().describe('Currency of the price'),
      dateCreated: z.string().nullable().describe('Date the message was created'),
      dateSent: z.string().nullable().describe('Date the message was sent')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.from && !ctx.input.messagingServiceSid) {
      throw twilioServiceError(
        'Either from or messagingServiceSid is required to send a message.'
      );
    }

    let hasMedia = (ctx.input.mediaUrls?.length ?? 0) > 0;
    if (!ctx.input.body && !hasMedia && !ctx.input.contentSid) {
      throw twilioServiceError(
        'Message content is required: provide body, mediaUrls, or contentSid.'
      );
    }

    if (ctx.input.mediaUrls && ctx.input.mediaUrls.length > 10) {
      throw twilioServiceError('Twilio MMS messages support up to 10 mediaUrls.');
    }

    if (ctx.input.sendAt && !ctx.input.messagingServiceSid) {
      throw twilioServiceError('Scheduled messages require messagingServiceSid.');
    }

    if (ctx.input.contentVariables && !ctx.input.contentSid) {
      throw twilioServiceError('contentVariables requires contentSid.');
    }

    if (ctx.input.shortenUrls && !ctx.input.messagingServiceSid) {
      throw twilioServiceError('shortenUrls requires messagingServiceSid.');
    }

    let client = new TwilioClient({
      accountSid: ctx.config.accountSid,
      token: ctx.auth.token,
      apiKeySid: ctx.auth.apiKeySid
    });

    let result = await client.sendMessage({
      to: ctx.input.to,
      from: ctx.input.from,
      body: ctx.input.body,
      messagingServiceSid: ctx.input.messagingServiceSid,
      mediaUrl: ctx.input.mediaUrls,
      contentSid: ctx.input.contentSid,
      contentVariables: ctx.input.contentVariables,
      shortenUrls: ctx.input.shortenUrls,
      sendAsMms: ctx.input.sendAsMms,
      statusCallback: ctx.input.statusCallbackUrl,
      scheduleType: ctx.input.sendAt ? 'fixed' : undefined,
      sendAt: ctx.input.sendAt
    });

    return {
      output: {
        messageSid: result.sid,
        status: result.status,
        to: result.to,
        from: result.from,
        body: result.body,
        numSegments: result.num_segments,
        numMedia: result.num_media,
        direction: result.direction,
        price: result.price,
        priceUnit: result.price_unit,
        dateCreated: result.date_created,
        dateSent: result.date_sent
      },
      message: `Message **${result.sid}** ${ctx.input.sendAt ? 'scheduled' : 'sent'} to **${ctx.input.to}** with status **${result.status}**.`
    };
  })
  .build();

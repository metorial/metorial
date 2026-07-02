import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwilioClient } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  messageSid: z.string().describe('Unique SID of the message'),
  status: z.string().describe('Message delivery status'),
  to: z.string().describe('Recipient phone number'),
  from: z.string().nullable().describe('Sender phone number'),
  body: z.string().nullable().describe('Message body text'),
  direction: z
    .string()
    .describe('Message direction (inbound, outbound-api, outbound-call, outbound-reply)'),
  numSegments: z.string().describe('Number of SMS segments'),
  numMedia: z.string().describe('Number of media attachments'),
  price: z.string().nullable().describe('Price charged for the message'),
  priceUnit: z.string().nullable().describe('Currency of the price'),
  errorCode: z.number().nullable().describe('Error code if the message failed'),
  errorMessage: z.string().nullable().describe('Error message if the message failed'),
  dateCreated: z.string().nullable().describe('Date the message was created'),
  dateSent: z.string().nullable().describe('Date the message was sent')
});

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `Retrieve a list of messages from your Twilio account. Filter by sender, recipient, or date. Also supports fetching a single message by SID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      messageSid: z
        .string()
        .optional()
        .describe(
          'Fetch a specific message by its SID (starts with SM). If provided, other filters are ignored.'
        ),
      to: z.string().optional().describe('Filter messages sent to this phone number.'),
      from: z.string().optional().describe('Filter messages sent from this phone number.'),
      dateSentAfter: z
        .string()
        .optional()
        .describe('Filter messages sent after this date (YYYY-MM-DD format).'),
      dateSentBefore: z
        .string()
        .optional()
        .describe('Filter messages sent before this date (YYYY-MM-DD format).'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of messages to return per page (max 1000, default 50).')
    })
  )
  .output(
    z.object({
      messages: z.array(messageSchema).describe('List of messages'),
      hasMore: z.boolean().describe('Whether there are more messages available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwilioClient({
      accountSid: ctx.config.accountSid,
      token: ctx.auth.token,
      apiKeySid: ctx.auth.apiKeySid
    });

    if (ctx.input.messageSid) {
      let result = await client.getMessage(ctx.input.messageSid);
      let mapped = {
        messageSid: result.sid,
        status: result.status,
        to: result.to,
        from: result.from,
        body: result.body,
        direction: result.direction,
        numSegments: result.num_segments,
        numMedia: result.num_media,
        price: result.price,
        priceUnit: result.price_unit,
        errorCode: result.error_code,
        errorMessage: result.error_message,
        dateCreated: result.date_created,
        dateSent: result.date_sent
      };
      return {
        output: { messages: [mapped], hasMore: false },
        message: `Fetched message **${result.sid}** (status: **${result.status}**).`
      };
    }

    let result = await client.listMessages({
      to: ctx.input.to,
      from: ctx.input.from,
      dateSentAfter: ctx.input.dateSentAfter,
      dateSentBefore: ctx.input.dateSentBefore,
      pageSize: ctx.input.pageSize
    });

    let messages = (result.messages || []).map((m: any) => ({
      messageSid: m.sid,
      status: m.status,
      to: m.to,
      from: m.from,
      body: m.body,
      direction: m.direction,
      numSegments: m.num_segments,
      numMedia: m.num_media,
      price: m.price,
      priceUnit: m.price_unit,
      errorCode: m.error_code,
      errorMessage: m.error_message,
      dateCreated: m.date_created,
      dateSent: m.date_sent
    }));

    return {
      output: { messages, hasMore: !!result.next_page_uri },
      message: `Found **${messages.length}** message(s).${result.next_page_uri ? ' More results available.' : ''}`
    };
  })
  .build();

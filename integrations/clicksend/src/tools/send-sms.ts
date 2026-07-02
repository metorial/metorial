import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickSendClient } from '../lib/client';
import { spec } from '../spec';

let smsRecipientSchema = z.object({
  to: z.string().describe('Recipient phone number in E.164 format (e.g., +1234567890)'),
  body: z.string().describe('SMS message body'),
  from: z
    .string()
    .optional()
    .describe('Custom sender ID or phone number (alphanumeric, max 11 characters)'),
  schedule: z
    .number()
    .optional()
    .describe('Unix timestamp to schedule the message for future delivery'),
  customString: z.string().optional().describe('Your own reference string for tracking'),
  country: z
    .string()
    .optional()
    .describe('ISO 3166-1 alpha-2 country code to auto-format the number')
});

let smsResultSchema = z.object({
  messageId: z.string().describe('Unique identifier for the sent message'),
  to: z.string().describe('Recipient phone number'),
  from: z.string().describe('Sender ID or number used'),
  body: z.string().describe('Message body'),
  status: z.string().describe('Delivery status of the message'),
  schedule: z.number().optional().describe('Scheduled timestamp if applicable'),
  customString: z.string().optional().describe('Custom reference string if provided')
});

export let sendSmsTool = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send one or more SMS messages to phone numbers worldwide. Supports custom sender IDs, scheduled delivery, and custom tracking strings. Messages are sent individually to each recipient.`,
  instructions: [
    'Phone numbers should be in E.164 format (e.g., +61411111111 for Australia)',
    'Alphanumeric sender IDs are limited to 11 characters with no spaces',
    'Schedule timestamps must be Unix timestamps in the future'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messages: z.array(smsRecipientSchema).min(1).describe('List of SMS messages to send')
    })
  )
  .output(
    z.object({
      totalPrice: z.number().describe('Total cost of all messages sent'),
      queuedCount: z.number().describe('Number of messages queued for delivery'),
      messages: z.array(smsResultSchema).describe('Details for each sent message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickSendClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    ctx.progress('Sending SMS messages...');

    let result = await client.sendSms(ctx.input.messages);

    let sentMessages = result.data?.messages || [];
    let mappedMessages = sentMessages.map((msg: any) => ({
      messageId: msg.message_id || '',
      to: msg.to || '',
      from: msg.from || '',
      body: msg.body || '',
      status: msg.status || '',
      schedule: msg.schedule || undefined,
      customString: msg.custom_string || undefined
    }));

    let totalPrice = sentMessages.reduce(
      (sum: number, msg: any) => sum + (Number.parseFloat(msg.message_price) || 0),
      0
    );

    return {
      output: {
        totalPrice,
        queuedCount: mappedMessages.length,
        messages: mappedMessages
      },
      message: `Sent **${mappedMessages.length}** SMS message(s). Total cost: **$${totalPrice.toFixed(4)}**`
    };
  })
  .build();

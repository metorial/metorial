import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickSendClient } from '../lib/client';
import { spec } from '../spec';

export let sendMmsTool = SlateTool.create(spec, {
  name: 'Send MMS',
  key: 'send_mms',
  description: `Send MMS (multimedia) messages with images, video, or other media content. Requires a subject line and a publicly accessible media file URL. Supports scheduling and sending to multiple recipients.`,
  instructions: [
    'The media file URL must be publicly accessible',
    'A subject line is required for MMS messages',
    'All messages in a single request share the same media file'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messages: z
        .array(
          z.object({
            to: z.string().describe('Recipient phone number in E.164 format'),
            body: z.string().describe('MMS message body text'),
            subject: z.string().describe('Subject line for the MMS'),
            mediaFileUrl: z
              .string()
              .describe('Publicly accessible URL to the media file (image, video, etc.)'),
            from: z.string().optional().describe('Custom sender ID or phone number'),
            schedule: z.number().optional().describe('Unix timestamp for scheduled delivery'),
            country: z
              .string()
              .optional()
              .describe('ISO country code for auto-formatting the number')
          })
        )
        .min(1)
        .describe('List of MMS messages to send')
    })
  )
  .output(
    z.object({
      totalPrice: z.number().describe('Total cost of all messages sent'),
      queuedCount: z.number().describe('Number of messages queued'),
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Unique message identifier'),
            to: z.string().describe('Recipient phone number'),
            from: z.string().describe('Sender ID used'),
            body: z.string().describe('Message body'),
            status: z.string().describe('Delivery status')
          })
        )
        .describe('Details for each sent MMS')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickSendClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    ctx.progress('Sending MMS messages...');

    let result = await client.sendMms(ctx.input.messages);

    let sentMessages = result.data?.messages || [];
    let mappedMessages = sentMessages.map((msg: any) => ({
      messageId: msg.message_id || '',
      to: msg.to || '',
      from: msg.from || '',
      body: msg.body || '',
      status: msg.status || ''
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
      message: `Sent **${mappedMessages.length}** MMS message(s). Total cost: **$${totalPrice.toFixed(4)}**`
    };
  })
  .build();

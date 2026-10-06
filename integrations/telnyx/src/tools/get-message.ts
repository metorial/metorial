import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { spec } from '../spec';

export let getMessage = SlateTool.create(spec, {
  name: 'Get Message',
  key: 'get_message',
  description: `Retrieve details of a specific message by its ID. Returns the full message data including delivery status, sender, recipient, and content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      messageId: z.string().describe('The unique ID of the message to retrieve')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique ID of the message'),
      from: z.string().nullish().describe('Sender phone number'),
      to: z.string().nullish().describe('Recipient phone number'),
      text: z.string().nullish().describe('Message body text'),
      type: z.string().nullish().describe('Message type (SMS or MMS)'),
      direction: z.string().nullish().describe('Message direction (inbound or outbound)'),
      status: z
        .string()
        .nullish()
        .describe('First recipient status; use recipients for all delivery states'),
      recipients: z
        .array(z.object({ phoneNumber: z.string(), status: z.string().nullish() }))
        .optional(),
      receivedAt: z
        .string()
        .nullish()
        .describe('Native received timestamp; may be null while pending'),
      createdAt: z.string().nullish().describe('When the message was created'),
      sentAt: z.string().nullish().describe('When the message was sent'),
      completedAt: z.string().nullish().describe('When the message delivery completed'),
      cost: z.any().optional().describe('Cost of sending the message'),
      parts: z.number().optional().describe('Number of message parts/segments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });
    let result = await client.getMessage(ctx.input.messageId);

    return {
      output: {
        messageId: result.id,
        from: result.from?.phone_number,
        to: result.to?.[0]?.phone_number,
        text: result.text,
        type: result.type,
        direction: result.direction,
        status: result.to[0]!.status,
        recipients: result.to.map(recipient => ({
          phoneNumber: recipient.phone_number,
          status: recipient.status
        })),
        createdAt: result.created_at,
        receivedAt: result.received_at,
        sentAt: result.sent_at,
        completedAt: result.completed_at,
        cost: result.cost,
        parts: result.parts
      },
      message: `Message **${result.id}**: ${result.direction ?? 'unknown'} ${result.type ?? 'message'}, status: ${result.to?.[0]?.status ?? 'unknown'}.`
    };
  })
  .build();

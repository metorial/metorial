import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send an SMS or MMS message to a phone number. Supports text messages, media attachments (MMS), and alphanumeric sender IDs. Can optionally target a specific messaging profile.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      from: z
        .string()
        .describe(
          'Sender E.164 number, short code, or alphanumeric sender ID (e.g., +15551234567)'
        ),
      to: z.string().describe('Recipient phone number in E.164 format (e.g., +15559876543)'),
      text: z.string().optional().describe('Message body text'),
      mediaUrls: z
        .array(z.string())
        .optional()
        .describe(
          'Up to ten media URLs for MMS, total size under 1MB. Omit for SMS; an empty array also selects MMS. Text-only MMS can omit this field.'
        ),
      messagingProfileId: z
        .string()
        .optional()
        .describe('Messaging profile ID to use for sending'),
      subject: z.string().optional().describe('MMS subject field'),
      type: z
        .enum(['SMS', 'MMS'])
        .optional()
        .describe('Message type. Auto-detected if not specified'),
      autoDetect: z
        .boolean()
        .optional()
        .describe('Automatically detect if message should be split into multiple segments')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique ID of the sent message'),
      from: z.string().describe('Sender phone number or ID'),
      to: z.string().describe('Recipient phone number'),
      text: z.string().nullish().describe('Message body text'),
      type: z.string().nullish().describe('Message type (SMS or MMS)'),
      direction: z.string().nullish().describe('Message direction'),
      status: z.string().nullish().describe('Current message status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });

    let result = await client.sendMessage({
      from: ctx.input.from,
      to: ctx.input.to,
      text: ctx.input.text,
      mediaUrls: ctx.input.mediaUrls,
      messagingProfileId: ctx.input.messagingProfileId,
      subject: ctx.input.subject,
      type: ctx.input.type,
      autoDetect: ctx.input.autoDetect
    });

    return {
      output: {
        messageId: result.id,
        from: result.from.phone_number,
        to: result.to[0]!.phone_number,
        text: result.text,
        type: result.type,
        direction: result.direction,
        status: result.to?.[0]?.status
      },
      message: `Message accepted from **${ctx.input.from}** to **${ctx.input.to}**. Status: ${result.to[0]!.status ?? 'not reported'}.`
    };
  })
  .build();

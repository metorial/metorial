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
          'Sender phone number or alphanumeric sender ID in E.164 format (e.g., +15551234567)'
        ),
      to: z.string().describe('Recipient phone number in E.164 format (e.g., +15559876543)'),
      text: z.string().optional().describe('Message body text'),
      mediaUrls: z
        .array(z.string())
        .optional()
        .describe('Array of media URLs for MMS (total size must be under 1MB)'),
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
      text: z.string().optional().describe('Message body text'),
      type: z.string().optional().describe('Message type (SMS or MMS)'),
      direction: z.string().optional().describe('Message direction'),
      status: z.string().optional().describe('Current message status')
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
        from: result.from?.phone_number ?? ctx.input.from,
        to: result.to?.[0]?.phone_number ?? ctx.input.to,
        text: result.text,
        type: result.type,
        direction: result.direction,
        status: result.to?.[0]?.status
      },
      message: `Message sent from **${ctx.input.from}** to **${ctx.input.to}**. Status: ${result.to?.[0]?.status ?? 'queued'}.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  messageId: z.number().describe('Unique message ID'),
  senderId: z.number().describe('User ID of the sender'),
  senderFullName: z.string().describe('Full name of the sender'),
  senderEmail: z.string().describe('Email of the sender'),
  type: z.string().describe('Message type: "stream" or "private"'),
  channelId: z.number().optional().describe('Channel (stream) ID, if a channel message'),
  displayRecipient: z
    .any()
    .describe(
      'Channel name (string) for channel messages, or array of recipients for direct messages'
    ),
  subject: z.string().describe('Topic name for the message'),
  content: z.string().describe('Rendered HTML content of the message'),
  timestamp: z.number().describe('Unix timestamp when the message was sent'),
  isMeMessage: z.boolean().optional().describe('Whether the message is a /me status message'),
  reactions: z
    .array(
      z.object({
        emojiName: z.string(),
        emojiCode: z.string(),
        userIds: z.array(z.number())
      })
    )
    .optional()
    .describe('Emoji reactions on the message')
});

export let getMessages = SlateTool.create(spec, {
  name: 'Get Messages',
  key: 'get_messages',
  description: `Retrieve messages from Zulip using flexible filtering. Search by channel, topic, sender, direct messages, or keywords using Zulip's narrow query system.`,
  instructions: [
    'Use narrow filters to target specific channels, topics, or senders. Common operators: "stream" (channel name), "topic", "sender", "dm" (for direct messages), "search" (full-text search).',
    'Set numBefore/numAfter relative to the anchor point. Use anchor "newest" with numBefore > 0 to get recent messages.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      anchor: z
        .union([z.string(), z.number()])
        .optional()
        .describe(
          'Message ID to anchor around, or "newest"/"oldest"/"first_unread". Defaults to "newest"'
        ),
      numBefore: z
        .number()
        .optional()
        .describe('Number of messages before the anchor to retrieve. Defaults to 20'),
      numAfter: z
        .number()
        .optional()
        .describe('Number of messages after the anchor to retrieve. Defaults to 0'),
      narrow: z
        .array(
          z.object({
            operator: z
              .string()
              .describe(
                'Filter operator (e.g., "stream", "topic", "sender", "dm", "search", "is")'
              ),
            operand: z
              .union([z.string(), z.number()])
              .describe('Value for the filter operator')
          })
        )
        .optional()
        .describe('Array of narrow filters to apply')
    })
  )
  .output(
    z.object({
      messages: z.array(messageSchema).describe('Retrieved messages'),
      foundAnchor: z.boolean().optional().describe('Whether the anchor message was found'),
      foundNewest: z
        .boolean()
        .optional()
        .describe('Whether the newest message matching the narrow was found'),
      foundOldest: z
        .boolean()
        .optional()
        .describe('Whether the oldest message matching the narrow was found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });
    let narrow = ctx.input.narrow
      ?.filter(item => item.operand !== undefined)
      .map(item => ({
        operator: item.operator,
        operand: item.operand as string | number
      }));

    let result = await client.getMessages({
      anchor: ctx.input.anchor,
      numBefore: ctx.input.numBefore ?? 20,
      numAfter: ctx.input.numAfter ?? 0,
      narrow
    });

    let messages = (result.messages || []).map((m: any) => ({
      messageId: m.id,
      senderId: m.sender_id,
      senderFullName: m.sender_full_name,
      senderEmail: m.sender_email,
      type: m.type,
      channelId: m.stream_id,
      displayRecipient: m.display_recipient,
      subject: m.subject,
      content: m.content,
      timestamp: m.timestamp,
      isMeMessage: m.is_me_message,
      reactions: m.reactions?.map((r: any) => ({
        emojiName: r.emoji_name,
        emojiCode: r.emoji_code,
        userIds: r.user?.user_id ? [r.user.user_id] : []
      }))
    }));

    return {
      output: {
        messages,
        foundAnchor: result.found_anchor,
        foundNewest: result.found_newest,
        foundOldest: result.found_oldest
      },
      message: `Retrieved ${messages.length} message(s)`
    };
  })
  .build();

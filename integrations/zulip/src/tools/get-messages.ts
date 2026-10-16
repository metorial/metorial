import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let messageSchema = z.object({
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
  content: z
    .string()
    .describe('Message content in HTML or Markdown, according to applyMarkdown'),
  timestamp: z.number().describe('Unix timestamp when the message was sent'),
  isMeMessage: z.boolean().optional().describe('Whether the message is a /me status message'),
  reactions: z
    .array(
      z.object({
        emojiName: z.string(),
        emojiCode: z.string(),
        userIds: z.array(z.number()),
        reactionType: z.string().optional()
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
      applyMarkdown: z
        .boolean()
        .optional()
        .describe(
          'Return rendered HTML when true, or original Markdown when false. Defaults to true'
        ),
      includeAnchor: z
        .boolean()
        .optional()
        .describe(
          'Whether to include the anchor message. Set false when continuing pagination to avoid duplicates'
        ),
      allowEmptyTopicName: z
        .boolean()
        .optional()
        .describe('Return empty topics as empty strings instead of the server display label'),
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
              .describe('Value for the filter operator'),
            negated: z.boolean().optional().describe('Exclude messages matching this filter')
          })
        )
        .optional()
        .describe('Array of narrow filters to apply')
    })
  )
  .output(
    z.object({
      messages: z.array(messageSchema).describe('Retrieved messages'),
      raw: z
        .any()
        .optional()
        .describe('Complete provider response, including pagination metadata'),
      anchor: z.number().optional().describe('Anchor message ID computed by the server'),
      historyLimited: z
        .boolean()
        .optional()
        .describe('Whether available message history was limited by the plan'),
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
        operand: item.operand as string | number,
        ...(item.negated !== undefined ? { negated: item.negated } : {})
      }));

    let result = await client.getMessages({
      anchor: ctx.input.anchor,
      numBefore: ctx.input.numBefore ?? 20,
      numAfter: ctx.input.numAfter ?? 0,
      narrow,
      applyMarkdown: ctx.input.applyMarkdown,
      includeAnchor: ctx.input.includeAnchor,
      allowEmptyTopicName: ctx.input.allowEmptyTopicName
    });

    let messages = (result.messages || []).map(mapMessage);

    return {
      output: {
        messages,
        raw: result,
        anchor: result.anchor,
        historyLimited: result.history_limited,
        foundAnchor: result.found_anchor,
        foundNewest: result.found_newest,
        foundOldest: result.found_oldest
      },
      message: `Retrieved ${messages.length} message(s)`
    };
  })
  .build();

export let mapMessage = (m: any) => ({
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
  reactions: m.reactions?.map((r: any) => {
    let userId = r.user_id ?? r.user?.id ?? r.user?.user_id;
    return {
      emojiName: r.emoji_name,
      emojiCode: r.emoji_code,
      userIds: userId !== undefined ? [userId] : [],
      reactionType: r.reaction_type
    };
  })
});

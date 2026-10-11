import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZOOM_USER_AUTH_METHODS } from '../lib/authMethods';
import { assertChatRecipient, describeChatRecipient } from '../lib/chatRecipient';
import { ZoomClient } from '../lib/client';
import { zoomServiceError } from '../lib/errors';
import { spec } from '../spec';

// Zoom expects `yyyy-MM-dd'T'HH:mm:ss'Z'` for thread time bounds.
let toZoomDateTime = (epochMs: number) =>
  new Date(epochMs).toISOString().replace(/\.\d{3}Z$/, 'Z');

let toIso = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? new Date(value).toISOString()
    : undefined;

// https://developers.zoom.us/docs/api/team-chat/#tag/chat-messages/GET/chat/users/{userId}/messages/{messageId}/thread
export let listChatThreadReplies = SlateTool.create(spec, {
  name: 'List Chat Thread Replies',
  key: 'list_chat_thread_replies',
  description: `List the replies in a Zoom Team Chat thread, optionally with the thread's main message. Identify the thread by its main message ID and the channel or contact where it was posted.`,
  instructions: [
    'Use the ID of the main (top-level) message as messageId; a reply ID does not identify a thread.',
    'Results are limited to 100 replies per call. To read further, call again with from set to just after the last reply time (sort asc) or to set to just before the earliest reply time (sort desc).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .default('me')
        .describe('User ID or email. Use "me" for the authenticated user'),
      messageId: z.string().min(1).describe('ID of the thread main message'),
      toChannel: z.string().optional().describe('Channel ID where the thread was posted'),
      toContact: z
        .string()
        .optional()
        .describe('Email, user ID, or member ID of the contact for a direct-message thread'),
      from: z
        .string()
        .optional()
        .describe(
          'Only replies sent at or after this time (yyyy-MM-ddTHH:mm:ssZ). Defaults to the main message time.'
        ),
      to: z
        .string()
        .optional()
        .describe('Only replies sent at or before this time (yyyy-MM-ddTHH:mm:ssZ)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of replies to return (default 10, max 100)'),
      sort: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort by reply time; desc (default) returns the latest replies first'),
      includeMainMessage: z
        .boolean()
        .optional()
        .describe('Include the thread main message in the results (default true)'),
      includeReactions: z
        .boolean()
        .optional()
        .describe('Include emoji reactions on each message (default false)'),
      includeFiles: z
        .boolean()
        .optional()
        .describe('Include file details on each message (default false)')
    })
  )
  .output(
    z.object({
      total: z
        .number()
        .optional()
        .describe('Total number of replies in the thread, excluding the main message'),
      messages: z
        .array(
          z.object({
            messageId: z.string().optional().describe('Message ID'),
            message: z.string().optional().describe('Message text'),
            isReply: z
              .boolean()
              .optional()
              .describe('True for a reply, false for the main message'),
            timestamp: z.number().optional().describe('Message time in epoch milliseconds'),
            sentAt: z.string().optional().describe('Message time (ISO 8601)'),
            senderUserId: z.string().optional().describe('Sender user ID'),
            senderEmail: z.string().optional().describe('Sender email address'),
            senderMemberId: z.string().optional().describe('Sender member ID'),
            senderDisplayName: z.string().optional().describe('Sender display name'),
            messageType: z.string().optional().describe('Message type'),
            lastReplyTime: z
              .number()
              .optional()
              .describe('Latest reply time in epoch milliseconds (main message only)'),
            reactions: z
              .array(
                z.object({
                  emoji: z.string().optional().describe('Emoji code point, e.g. U+1F44D'),
                  count: z.number().optional().describe('Number of reactions with this emoji'),
                  reactedByMe: z
                    .boolean()
                    .optional()
                    .describe('Whether the queried user added this reaction')
                })
              )
              .optional()
              .describe('Emoji reactions, when requested'),
            files: z
              .array(
                z.object({
                  fileId: z.string().optional().describe('File ID'),
                  fileName: z.string().optional().describe('File name'),
                  fileSize: z.number().optional().describe('File size in bytes')
                })
              )
              .optional()
              .describe('Attached files, when requested')
          })
        )
        .describe('Thread messages')
    })
  )
  .authMethods(ZOOM_USER_AUTH_METHODS)
  .handleInvocation(async ctx => {
    let input = ctx.input;
    assertChatRecipient(input.toChannel, input.toContact, 'to read a chat thread');

    let client = new ZoomClient(ctx.auth.token);
    let recipient = { toChannel: input.toChannel, toContact: input.toContact };

    let from = input.from;
    if (!from) {
      let main = await client.getChatMessage(input.messageId, input.userId, recipient);
      if (typeof main?.timestamp !== 'number') {
        throw zoomServiceError(
          'Could not determine when the thread started; provide from (yyyy-MM-ddTHH:mm:ssZ).'
        );
      }
      from = toZoomDateTime(main.timestamp);
    }

    let result = await client.getChatThread(input.messageId, input.userId, {
      ...recipient,
      from,
      to: input.to,
      limit: input.limit,
      sort: input.sort,
      needMainMessage: input.includeMainMessage,
      needEmoji: input.includeReactions,
      needAttachment: input.includeFiles
    });

    let messages = (result.messages || []).map((item: any) => ({
      messageId: item.msg_id,
      message: item.message,
      isReply: item.is_reply,
      timestamp: item.timestamp,
      sentAt: toIso(item.timestamp),
      senderUserId: item.sender_user_id || undefined,
      senderEmail: item.sender_email || undefined,
      senderMemberId: item.sender_member_id || undefined,
      senderDisplayName: item.sender_display_name || undefined,
      messageType: item.message_type,
      lastReplyTime: item.last_reply_time,
      reactions: Array.isArray(item.reactions)
        ? item.reactions.map((reaction: any) => ({
            emoji: reaction.emoji_id,
            count: reaction.count,
            reactedByMe: reaction.is_sender
          }))
        : undefined,
      files: Array.isArray(item.files)
        ? item.files.map((file: any) => ({
            fileId: file.file_id,
            fileName: file.file_name,
            fileSize: file.file_size
          }))
        : undefined
    }));

    return {
      output: {
        total: result.total,
        messages
      },
      message: `Found **${messages.length}** message(s) in thread **${input.messageId}** in ${describeChatRecipient(input.toChannel, input.toContact)}.`
    };
  })
  .build();

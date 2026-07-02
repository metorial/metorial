import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a text message, file message, or admin message to a group or open channel. Text messages require a sender userId; admin messages do not.`,
  instructions: [
    'For text messages (MESG), userId and message are required.',
    'For admin messages (ADMM), only message is required (no userId needed).',
    'For file messages (FILE), userId and fileUrl are required.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelType: z.enum(['group_channels', 'open_channels']).describe('Type of channel'),
      channelUrl: z.string().describe('URL of the target channel'),
      messageType: z
        .enum(['MESG', 'FILE', 'ADMM'])
        .describe('MESG for text, FILE for file, ADMM for admin message'),
      userId: z.string().optional().describe('Sender user ID (required for MESG and FILE)'),
      message: z
        .string()
        .optional()
        .describe('Text content of the message (for MESG and ADMM)'),
      fileUrl: z.string().optional().describe('URL of the file (for FILE messages)'),
      fileName: z.string().optional().describe('Name of the file'),
      fileType: z.string().optional().describe('MIME type of the file'),
      fileSize: z.number().optional().describe('File size in bytes'),
      customType: z.string().optional().describe('Custom message type for categorization'),
      data: z.string().optional().describe('Additional data as a JSON string'),
      mentionType: z
        .enum(['users', 'channel'])
        .optional()
        .describe(
          'Type of mention: "users" to mention specific users, "channel" to mention all'
        ),
      mentionedUserIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to mention (when mentionType is "users")'),
      dedupId: z.string().optional().describe('Deduplication ID to prevent duplicate messages')
    })
  )
  .output(
    z.object({
      messageId: z.number().describe('Unique message ID'),
      messageType: z.string().describe('Type of message sent'),
      message: z.string().optional().describe('Text content of the message'),
      channelUrl: z.string().describe('Channel URL where the message was sent'),
      channelType: z.string().describe('Type of channel'),
      createdAt: z.number().describe('Unix timestamp of when the message was sent'),
      senderId: z.string().optional().describe('User ID of the sender')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    let result = await client.sendMessage(ctx.input.channelType, ctx.input.channelUrl, {
      messageType: ctx.input.messageType,
      userId: ctx.input.userId,
      message: ctx.input.message,
      fileUrl: ctx.input.fileUrl,
      fileName: ctx.input.fileName,
      fileType: ctx.input.fileType,
      fileSize: ctx.input.fileSize,
      customType: ctx.input.customType,
      data: ctx.input.data,
      mentionType: ctx.input.mentionType,
      mentionedUserIds: ctx.input.mentionedUserIds,
      dedupId: ctx.input.dedupId
    });

    return {
      output: {
        messageId: result.message_id,
        messageType: result.type ?? ctx.input.messageType,
        message: result.message,
        channelUrl: result.channel_url ?? ctx.input.channelUrl,
        channelType: result.channel_type ?? ctx.input.channelType,
        createdAt: result.created_at ?? 0,
        senderId: result.user?.user_id ?? ctx.input.userId
      },
      message: `Sent ${ctx.input.messageType} message to **${ctx.input.channelUrl}** (ID: ${result.message_id}).`
    };
  })
  .build();

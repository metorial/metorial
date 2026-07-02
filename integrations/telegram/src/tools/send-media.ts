import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

export let sendMediaTool = SlateTool.create(spec, {
  name: 'Send Media',
  key: 'send_media',
  description: `Send a photo, document, audio, or video message to a chat. Provide a URL or file ID for the media. Supports captions with formatting.`,
  instructions: [
    'For photo, provide a URL or a previously uploaded file_id.',
    'For document, audio, and video, provide a URL or file_id.',
    'Captions support the same formatting as text messages (HTML, MarkdownV2).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chatId: z.string().describe('Chat ID or @username of the target chat'),
      mediaType: z
        .enum(['photo', 'document', 'audio', 'video'])
        .describe('Type of media to send'),
      mediaUrl: z.string().describe('URL or file_id of the media to send'),
      caption: z.string().optional().describe('Caption for the media'),
      parseMode: z
        .enum(['HTML', 'MarkdownV2', 'Markdown'])
        .optional()
        .describe('Caption formatting mode'),
      replyToMessageId: z.number().optional().describe('Message ID to reply to'),
      disableNotification: z
        .boolean()
        .optional()
        .describe('Send silently without notification'),
      messageThreadId: z.number().optional().describe('Forum topic thread ID'),
      audioDuration: z
        .number()
        .optional()
        .describe('Duration of audio in seconds (audio only)'),
      audioPerformer: z.string().optional().describe('Performer name (audio only)'),
      audioTitle: z.string().optional().describe('Track name (audio only)'),
      videoDuration: z
        .number()
        .optional()
        .describe('Duration of video in seconds (video only)'),
      videoWidth: z.number().optional().describe('Video width (video only)'),
      videoHeight: z.number().optional().describe('Video height (video only)')
    })
  )
  .output(
    z.object({
      messageId: z.number().describe('ID of the sent message'),
      chatId: z.string().describe('Chat ID where the media was sent'),
      caption: z.string().optional().describe('Caption of the sent media'),
      date: z.number().describe('Unix timestamp when the message was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelegramClient(ctx.auth.token);
    let result: any;

    switch (ctx.input.mediaType) {
      case 'photo':
        result = await client.sendPhoto({
          chatId: ctx.input.chatId,
          photo: ctx.input.mediaUrl,
          caption: ctx.input.caption,
          parseMode: ctx.input.parseMode,
          replyToMessageId: ctx.input.replyToMessageId,
          disableNotification: ctx.input.disableNotification,
          messageThreadId: ctx.input.messageThreadId
        });
        break;
      case 'document':
        result = await client.sendDocument({
          chatId: ctx.input.chatId,
          document: ctx.input.mediaUrl,
          caption: ctx.input.caption,
          parseMode: ctx.input.parseMode,
          replyToMessageId: ctx.input.replyToMessageId,
          disableNotification: ctx.input.disableNotification,
          messageThreadId: ctx.input.messageThreadId
        });
        break;
      case 'audio':
        result = await client.sendAudio({
          chatId: ctx.input.chatId,
          audio: ctx.input.mediaUrl,
          caption: ctx.input.caption,
          parseMode: ctx.input.parseMode,
          duration: ctx.input.audioDuration,
          performer: ctx.input.audioPerformer,
          title: ctx.input.audioTitle,
          replyToMessageId: ctx.input.replyToMessageId,
          disableNotification: ctx.input.disableNotification,
          messageThreadId: ctx.input.messageThreadId
        });
        break;
      case 'video':
        result = await client.sendVideo({
          chatId: ctx.input.chatId,
          video: ctx.input.mediaUrl,
          caption: ctx.input.caption,
          parseMode: ctx.input.parseMode,
          duration: ctx.input.videoDuration,
          width: ctx.input.videoWidth,
          height: ctx.input.videoHeight,
          replyToMessageId: ctx.input.replyToMessageId,
          disableNotification: ctx.input.disableNotification,
          messageThreadId: ctx.input.messageThreadId
        });
        break;
    }

    return {
      output: {
        messageId: result.message_id,
        chatId: String(result.chat.id),
        caption: result.caption,
        date: result.date
      },
      message: `${ctx.input.mediaType.charAt(0).toUpperCase() + ctx.input.mediaType.slice(1)} sent to chat **${ctx.input.chatId}** (message ID: ${result.message_id}).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Msg91Client } from '../lib/client';
import { spec } from '../spec';

export let sendRcsMessage = SlateTool.create(spec, {
  name: 'Send RCS Message',
  key: 'send_rcs_message',
  description: `Send Rich Communication Services (RCS) messages with different content types: text templates, media (images/videos), or rich cards with optional suggestions.`,
  instructions: [
    'Choose the appropriate content type based on the message you want to send.',
    'Rich cards support titles, descriptions, media, and suggested action buttons.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contentType: z
        .enum(['text', 'media', 'rich_card'])
        .describe('Type of RCS content to send'),
      to: z.string().describe('Recipient mobile number with country code'),
      senderId: z.string().describe('RCS sender/agent ID'),
      message: z.string().optional().describe('Text message content (for "text" type)'),
      mediaUrl: z
        .string()
        .optional()
        .describe('Public URL of media file (for "media" and "rich_card" types)'),
      mediaType: z
        .string()
        .optional()
        .describe('MIME type of media (e.g., "image/jpeg", "video/mp4")'),
      caption: z.string().optional().describe('Caption for media (for "media" type)'),
      title: z.string().optional().describe('Card title (for "rich_card" type)'),
      description: z.string().optional().describe('Card description (for "rich_card" type)'),
      suggestions: z
        .array(
          z.object({
            text: z.string().describe('Suggestion button text'),
            postbackData: z.string().describe('Postback data sent when suggestion is tapped')
          })
        )
        .optional()
        .describe('Suggested reply/action buttons (for "rich_card" type)')
    })
  )
  .output(
    z.object({
      response: z.any().describe('API response from MSG91')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.contentType === 'text') {
      if (!ctx.input.message) throw new Error('message is required for text content type');
      result = await client.sendRcsText({
        to: ctx.input.to,
        message: ctx.input.message,
        senderId: ctx.input.senderId
      });
    } else if (ctx.input.contentType === 'media') {
      if (!ctx.input.mediaUrl || !ctx.input.mediaType)
        throw new Error('mediaUrl and mediaType are required for media content type');
      result = await client.sendRcsMedia({
        to: ctx.input.to,
        mediaUrl: ctx.input.mediaUrl,
        mediaType: ctx.input.mediaType,
        caption: ctx.input.caption,
        senderId: ctx.input.senderId
      });
    } else {
      if (!ctx.input.title) throw new Error('title is required for rich_card content type');
      result = await client.sendRcsRichCard({
        to: ctx.input.to,
        senderId: ctx.input.senderId,
        title: ctx.input.title,
        description: ctx.input.description,
        mediaUrl: ctx.input.mediaUrl,
        mediaType: ctx.input.mediaType,
        suggestions: ctx.input.suggestions
      });
    }

    return {
      output: { response: result },
      message: `RCS ${ctx.input.contentType} message sent to **${ctx.input.to}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let embedSchema = z
  .object({
    iconUrl: z.string().optional().describe('URL for the embed icon'),
    url: z.string().optional().describe('URL the embed title links to'),
    title: z.string().optional().describe('Title of the embed'),
    description: z.string().optional().describe('Description text of the embed'),
    media: z.string().optional().describe('Uploaded file ID to use as media in the embed'),
    colour: z.string().optional().describe('Embed accent colour (CSS-compatible color string)')
  })
  .describe('Embed to include in the message');

let replySchema = z
  .object({
    messageId: z.string().describe('ID of the message to reply to'),
    mention: z
      .boolean()
      .default(true)
      .describe('Whether to mention the author of the replied message')
  })
  .describe('Message to reply to');

let masqueradeSchema = z
  .object({
    name: z.string().optional().describe('Override the displayed username'),
    avatar: z.string().optional().describe('Override the displayed avatar URL'),
    colour: z.string().optional().describe('Override the displayed name colour')
  })
  .describe('Masquerade options to override displayed identity');

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message to a Revolt channel. Supports text content, embeds, file attachments (by ID), replies, and masquerade (overriding displayed username/avatar). Can be used for both server channels and direct messages.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelId: z.string().describe('ID of the channel to send the message to'),
      content: z.string().optional().describe('Text content of the message'),
      attachments: z
        .array(z.string())
        .optional()
        .describe('Array of uploaded file IDs to attach'),
      embeds: z.array(embedSchema).optional().describe('Embeds to include in the message'),
      replies: z.array(replySchema).optional().describe('Messages to reply to'),
      masquerade: masqueradeSchema
        .optional()
        .describe('Override the displayed identity for this message')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the sent message'),
      channelId: z.string().describe('ID of the channel the message was sent to'),
      authorId: z.string().describe('ID of the message author'),
      content: z.string().optional().describe('Text content of the message')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.sendMessage(ctx.input.channelId, {
      content: ctx.input.content,
      attachments: ctx.input.attachments,
      embeds: ctx.input.embeds?.map(e => ({
        icon_url: e.iconUrl,
        url: e.url,
        title: e.title,
        description: e.description,
        media: e.media,
        colour: e.colour
      })),
      replies: ctx.input.replies?.map(r => ({
        id: r.messageId,
        mention: r.mention
      })),
      masquerade: ctx.input.masquerade
        ? {
            name: ctx.input.masquerade.name,
            avatar: ctx.input.masquerade.avatar,
            colour: ctx.input.masquerade.colour
          }
        : undefined
    });

    return {
      output: {
        messageId: result._id,
        channelId: result.channel,
        authorId: result.author,
        content: result.content ?? undefined
      },
      message: `Message sent to channel \`${ctx.input.channelId}\`${ctx.input.content ? `: "${ctx.input.content.substring(0, 100)}${ctx.input.content.length > 100 ? '...' : ''}"` : ' with attachments/embeds'}`
    };
  })
  .build();

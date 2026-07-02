import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordServiceError } from '../lib/errors';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let embedFooterSchema = z
  .object({
    text: z.string().describe('Footer text'),
    icon_url: z.string().optional().describe('URL of footer icon')
  })
  .describe('Embed footer object');

let embedImageSchema = z
  .object({
    url: z.string().describe('URL of the image')
  })
  .describe('Embed image object');

let embedThumbnailSchema = z
  .object({
    url: z.string().describe('URL of the thumbnail')
  })
  .describe('Embed thumbnail object');

let embedAuthorSchema = z
  .object({
    name: z.string().describe('Name of the author'),
    url: z.string().optional().describe('URL link for the author name'),
    icon_url: z.string().optional().describe('URL of author icon')
  })
  .describe('Embed author object');

let embedFieldSchema = z.object({
  name: z.string().describe('Field name (required)'),
  value: z.string().describe('Field value (required)'),
  inline: z.boolean().optional().describe('Whether this field should display inline')
});

let embedSchema = z
  .object({
    title: z.string().optional().describe('Title of the embed'),
    description: z.string().optional().describe('Description text of the embed'),
    url: z.string().optional().describe('URL the embed title links to'),
    color: z
      .number()
      .optional()
      .describe('Color code of the embed (integer, e.g. 0x00FF00 for green)'),
    footer: embedFooterSchema.optional(),
    image: embedImageSchema.optional(),
    thumbnail: embedThumbnailSchema.optional(),
    author: embedAuthorSchema.optional(),
    fields: z
      .array(embedFieldSchema)
      .optional()
      .describe('Array of embed field objects (max 25)')
  })
  .describe('Discord embed object');

let messageReferenceSchema = z
  .object({
    message_id: z.string().describe('ID of the message to reply to')
  })
  .describe('Message reference for replying to a message');

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message to a Discord channel. Supports plain text content, rich embeds, replying to an existing message, and text-to-speech (TTS).`,
  instructions: [
    'Provide at least one of **content** or **embeds**. You may provide both.',
    'To reply to an existing message, provide a **messageReference** with the target message ID.',
    'Set **tts** to true to send the message as a text-to-speech message.',
    'Embeds support up to 25 fields each. Color values should be integers (e.g. 16711680 for red, 65280 for green, 255 for blue).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(discordActionScopes.sendMessage)
  .input(
    z.object({
      channelId: z.string().describe('The ID of the channel to send the message to'),
      content: z
        .string()
        .optional()
        .describe('Text content of the message (up to 2000 characters)'),
      embeds: z
        .array(embedSchema)
        .optional()
        .describe('Array of embed objects to include in the message (max 10)'),
      messageReference: messageReferenceSchema
        .optional()
        .describe('Reference to a message to reply to'),
      tts: z.boolean().optional().describe('Whether this is a text-to-speech message')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the sent message'),
      channelId: z.string().describe('ID of the channel the message was sent in'),
      content: z.string().describe('Text content of the sent message'),
      authorUsername: z.string().describe('Username of the message author'),
      authorId: z.string().describe('ID of the message author'),
      timestamp: z.string().describe('ISO 8601 timestamp of when the message was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });

    let data: Record<string, any> = {};

    if (!ctx.input.content && !ctx.input.embeds?.length) {
      throw discordServiceError('content or embeds is required to send a message');
    }

    if (ctx.input.content) {
      data.content = ctx.input.content;
    }

    if (ctx.input.embeds) {
      data.embeds = ctx.input.embeds;
    }

    if (ctx.input.messageReference) {
      data.message_reference = {
        message_id: ctx.input.messageReference.message_id
      };
    }

    if (ctx.input.tts) {
      data.tts = ctx.input.tts;
    }

    let message = await client.createMessage(ctx.input.channelId, data);

    return {
      output: {
        messageId: message.id,
        channelId: message.channel_id,
        content: message.content || '',
        authorUsername: message.author?.username || '',
        authorId: message.author?.id || '',
        timestamp: message.timestamp
      },
      message: ctx.input.messageReference
        ? `Sent reply in channel \`${message.channel_id}\`.`
        : `Sent message to channel \`${message.channel_id}\`.`
    };
  })
  .build();

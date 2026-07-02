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
    media: z.string().optional().describe('Uploaded file ID for media'),
    colour: z.string().optional().describe('Embed accent colour')
  })
  .describe('Embed to include in the message');

export let editMessage = SlateTool.create(spec, {
  name: 'Edit Message',
  key: 'edit_message',
  description: `Edit an existing message in a Revolt channel. Can update the text content and embeds. Only messages authored by the authenticated user/bot can be edited.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelId: z.string().describe('ID of the channel containing the message'),
      messageId: z.string().describe('ID of the message to edit'),
      content: z.string().optional().describe('New text content for the message'),
      embeds: z
        .array(embedSchema)
        .optional()
        .describe('New embeds for the message (replaces existing)')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the edited message'),
      channelId: z.string().describe('ID of the channel'),
      content: z.string().optional().describe('Updated text content')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.editMessage(ctx.input.channelId, ctx.input.messageId, {
      content: ctx.input.content,
      embeds: ctx.input.embeds?.map(e => ({
        icon_url: e.iconUrl,
        url: e.url,
        title: e.title,
        description: e.description,
        media: e.media,
        colour: e.colour
      }))
    });

    return {
      output: {
        messageId: result._id,
        channelId: result.channel,
        content: result.content ?? undefined
      },
      message: `Message \`${ctx.input.messageId}\` edited in channel \`${ctx.input.channelId}\``
    };
  })
  .build();

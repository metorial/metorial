import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOEmbed = SlateTool.create(spec, {
  name: 'Get Embed Code',
  key: 'get_oembed',
  description: `Generate an embeddable player widget for a SoundCloud track or playlist URL. Returns HTML embed code and metadata for embedding a SoundCloud player on external websites.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      url: z.string().describe('SoundCloud URL for a track, playlist, or user'),
      maxWidth: z
        .number()
        .optional()
        .describe('Maximum width of the embedded player in pixels'),
      maxHeight: z
        .number()
        .optional()
        .describe(
          'Maximum height of the embedded player in pixels (default: 166 for tracks, 450 for sets)'
        ),
      autoPlay: z
        .boolean()
        .optional()
        .describe('Enable autoplay on page load (default false)'),
      showComments: z
        .boolean()
        .optional()
        .describe('Show timed comments in the player (default true)'),
      color: z
        .string()
        .optional()
        .describe('Primary widget color as hex triplet without # (e.g., "ff0066")')
    })
  )
  .output(
    z.object({
      html: z.string().describe('HTML embed code for the player'),
      title: z.string().describe('Title of the embedded resource'),
      description: z.string().describe('Description of the resource'),
      authorName: z.string().describe('Name of the content author'),
      authorUrl: z.string().describe('URL to the author profile'),
      thumbnailUrl: z.string().nullable().describe('Thumbnail image URL'),
      width: z.string().describe('Player width'),
      height: z.number().describe('Player height in pixels'),
      providerName: z.string().describe('Provider name (SoundCloud)'),
      providerUrl: z.string().describe('Provider URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let oembed = await client.getOEmbed(ctx.input.url, {
      maxWidth: ctx.input.maxWidth,
      maxHeight: ctx.input.maxHeight,
      autoPlay: ctx.input.autoPlay,
      showComments: ctx.input.showComments,
      color: ctx.input.color
    });

    return {
      output: {
        html: oembed.html,
        title: oembed.title,
        description: oembed.description,
        authorName: oembed.author_name,
        authorUrl: oembed.author_url,
        thumbnailUrl: oembed.thumbnail_url,
        width: oembed.width,
        height: oembed.height,
        providerName: oembed.provider_name,
        providerUrl: oembed.provider_url
      },
      message: `Generated embed code for **"${oembed.title}"** by ${oembed.author_name}.`
    };
  })
  .build();

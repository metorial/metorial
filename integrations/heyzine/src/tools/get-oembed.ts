import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyzineClient } from '../lib/client';
import { spec } from '../spec';

export let getOembed = SlateTool.create(spec, {
  name: 'Get oEmbed Data',
  key: 'get_oembed',
  description: `Retrieves oEmbed 1.0 data for a flipbook URL, returning embed HTML, dimensions, and thumbnail information.
Useful for embedding flipbooks in third-party platforms that support oEmbed discovery.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      flipbookUrl: z.string().describe('URL of the flipbook to get oEmbed data for.'),
      maxWidth: z
        .number()
        .optional()
        .describe('Maximum width for the embedded content, in pixels.'),
      maxHeight: z
        .number()
        .optional()
        .describe('Maximum height for the embedded content, in pixels.')
    })
  )
  .output(
    z.object({
      type: z.string().describe('oEmbed type (e.g., "rich").'),
      version: z.string().describe('oEmbed version.'),
      title: z.string().describe('Title of the flipbook.'),
      providerName: z.string().describe('Provider name.'),
      providerUrl: z.string().describe('Provider URL.'),
      html: z.string().describe('HTML embed code for the flipbook.'),
      width: z.number().describe('Width of the embedded content.'),
      height: z.number().describe('Height of the embedded content.'),
      thumbnailUrl: z.string().describe('URL of the thumbnail image.'),
      thumbnailWidth: z.number().describe('Width of the thumbnail.'),
      thumbnailHeight: z.number().describe('Height of the thumbnail.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyzineClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId
    });

    let data = await client.getOEmbed(
      ctx.input.flipbookUrl,
      ctx.input.maxWidth,
      ctx.input.maxHeight
    );

    return {
      output: {
        type: data.type || '',
        version: data.version || '',
        title: data.title || '',
        providerName: data.provider_name || '',
        providerUrl: data.provider_url || '',
        html: data.html || '',
        width: data.width || 0,
        height: data.height || 0,
        thumbnailUrl: data.thumbnail_url || '',
        thumbnailWidth: data.thumbnail_width || 0,
        thumbnailHeight: data.thumbnail_height || 0
      },
      message: `Retrieved oEmbed data for **${data.title || ctx.input.flipbookUrl}** (${data.width}x${data.height}).`
    };
  })
  .build();

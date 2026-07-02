import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyzineClient } from '../lib/client';
import { spec } from '../spec';

export let getFlipbook = SlateTool.create(spec, {
  name: 'Get Flipbook',
  key: 'get_flipbook',
  description: `Retrieves detailed information about a specific flipbook including its metadata, links, thumbnail, page count, tags, oEmbed data, and optionally its embed code.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      flipbookId: z.string().describe('Unique identifier of the flipbook.'),
      includeEmbedCode: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, also fetches the HTML embed code for the flipbook.'),
      maxWidth: z.number().optional().describe('Max width for the embed code, in pixels.'),
      maxHeight: z.number().optional().describe('Max height for the embed code, in pixels.')
    })
  )
  .output(
    z.object({
      flipbookId: z.string().describe('Unique identifier of the flipbook.'),
      title: z.string().describe('Title of the flipbook.'),
      subtitle: z.string().describe('Subtitle of the flipbook.'),
      description: z.string().describe('Description of the flipbook.'),
      url: z.string().describe('URL of the flipbook.'),
      thumbnailUrl: z.string().describe('URL of the flipbook thumbnail.'),
      pdfUrl: z.string().describe('URL of the source PDF.'),
      pages: z.number().describe('Number of pages in the flipbook.'),
      tags: z.string().describe('Comma-separated tags.'),
      created: z.string().describe('Creation date of the flipbook.'),
      links: z.record(z.string(), z.string()).describe('Map of related flipbook links.'),
      oembed: z.record(z.string(), z.any()).describe('oEmbed data for the flipbook.'),
      embedHtml: z.string().optional().describe('HTML embed code if requested.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyzineClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId
    });

    let details = await client.getFlipbookDetails(ctx.input.flipbookId);

    let embedHtml: string | undefined;
    if (ctx.input.includeEmbedCode) {
      let embedResult = await client.getEmbedCode(
        ctx.input.flipbookId,
        ctx.input.maxWidth,
        ctx.input.maxHeight
      );
      embedHtml = embedResult.html;
    }

    return {
      output: {
        flipbookId: details.id,
        title: details.title || '',
        subtitle: details.subtitle || '',
        description: details.description || '',
        url: details.url || '',
        thumbnailUrl: details.thumbnail || '',
        pdfUrl: details.pdf || '',
        pages: details.pages || 0,
        tags: details.tags || '',
        created: details.created || '',
        links: details.links || {},
        oembed: details.oembed || {},
        embedHtml
      },
      message: `Retrieved flipbook **${details.title || details.id}** (${details.pages || 0} pages).${embedHtml ? ' Embed code included.' : ''}`
    };
  })
  .build();

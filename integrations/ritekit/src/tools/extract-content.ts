import { SlateTool } from 'slates';
import { z } from 'zod';
import { RiteKitClient } from '../lib/client';
import { spec } from '../spec';

export let extractContent = SlateTool.create(spec, {
  name: 'Extract Content from URL',
  key: 'extract_content',
  description: `Extracts content from a web page URL. Can extract the full article text, a link preview (title, description, image), or the top/featured image.
Use this to pull content from URLs for social media sharing, content curation, or link previews.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the web page to extract content from'),
      extractType: z
        .enum(['article', 'preview', 'image'])
        .describe(
          'What to extract: "article" for full text, "preview" for link preview metadata, "image" for the top/featured image'
        )
    })
  )
  .output(
    z.object({
      title: z.string().optional().describe('Title of the article or page'),
      articleText: z
        .string()
        .optional()
        .describe('Extracted article text content (article mode)'),
      description: z.string().optional().describe('Page description (preview mode)'),
      imageUrl: z.string().optional().describe('Featured/top image URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RiteKitClient({ token: ctx.auth.token });

    if (ctx.input.extractType === 'article') {
      let result = await client.extractArticle(ctx.input.url);
      return {
        output: {
          title: result.title,
          articleText: result.text
        },
        message: `Extracted article: **${result.title}** (${(result.text || '').length} characters)`
      };
    }

    if (ctx.input.extractType === 'preview') {
      let result = await client.linkPreview(ctx.input.url);
      return {
        output: {
          title: result.title,
          description: result.description,
          imageUrl: result.image
        },
        message: `Link preview: **${result.title}**`
      };
    }

    // image extraction
    let result = await client.extractImageFromUrl(ctx.input.url);
    return {
      output: {
        imageUrl: result.url
      },
      message: `Extracted top image: ${result.url}`
    };
  })
  .build();

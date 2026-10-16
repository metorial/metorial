import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, quotaSchema } from '../lib/client';
import { spec } from '../spec';

export let extractNewsTool = SlateTool.create(spec, {
  name: 'Extract News from URL',
  key: 'extract_news',
  description: `Extract structured news article data from any given URL. Returns the article's title, full text, images (with captions and dimensions), videos (with summary, duration, thumbnail), publish date, authors, language, and source country and sentiment when available. Optionally performs named entity analysis on the content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the news article to extract'),
      analyze: z
        .boolean()
        .optional()
        .describe('Enable entity extraction and sentiment analysis on the content')
    })
  )
  .output(
    z.object({
      quota: quotaSchema.optional().describe('API point usage, when returned by the provider'),
      title: z.string().describe('Article headline'),
      text: z.string().describe('Full text content'),
      url: z.string().describe('Canonical URL of the article'),
      image: z.string().nullable().describe('Main article image URL'),
      images: z
        .array(
          z.object({
            url: z.string().describe('Image URL'),
            width: z.number().nullable().describe('Image width in pixels'),
            height: z.number().nullable().describe('Image height in pixels'),
            caption: z.string().nullable().optional().describe('Image caption, when available')
          })
        )
        .describe('All images in the article'),
      video: z.string().nullable().describe('Main video URL'),
      videos: z
        .array(
          z.object({
            url: z.string().describe('Video URL'),
            summary: z.string().nullable().describe('Video summary'),
            duration: z.number().nullable().describe('Provider-reported duration'),
            thumbnail: z.string().nullable().describe('Video thumbnail URL')
          })
        )
        .describe('All videos in the article'),
      publishDate: z.string().describe('Publication date and time reported by the provider'),
      authors: z.array(z.string()).describe('List of authors'),
      language: z.string().describe('ISO 639-1 language code'),
      sourceCountry: z
        .string()
        .optional()
        .describe('ISO 3166 source country code, when available'),
      sentiment: z
        .number()
        .nullable()
        .optional()
        .describe('Sentiment score from -1 to +1, when available'),
      raw: z.unknown().describe('Original provider response with credentials removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.extractNews({
      url: ctx.input.url,
      analyze: ctx.input.analyze
    });

    return {
      output: {
        ...(result.quota ? { quota: result.quota } : {}),
        title: result.title,
        text: result.text,
        url: result.url,
        image: result.image,
        images: result.images.map(image => ({
          url: image.url,
          width: image.width,
          height: image.height,
          caption: image.caption !== undefined ? image.caption : image.title
        })),
        video: result.video,
        videos: result.videos,
        publishDate: result.publish_date,
        authors: result.authors,
        language: result.language,
        sourceCountry: result.source_country,
        sentiment: result.sentiment,
        raw: result.raw
      },
      message: `Extracted article: **${result.title}** by ${result.authors.join(', ') || 'unknown author'}. Language: ${result.language}, sentiment: ${result.sentiment ?? 'N/A'}.`
    };
  })
  .build();

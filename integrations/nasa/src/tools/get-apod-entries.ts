import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient, validateDate, validateDateRange, validateInteger } from '../lib/client';
import { spec } from '../spec';

export let getApodEntries = SlateTool.create(spec, {
  name: 'Get Astronomy Picture Entries',
  key: 'get_apod_entries',
  description:
    'Retrieve Astronomy Picture of the Day entries with their scientific explanations, NASA article permalinks, media types, and available featured images. Supports a specific date, a date range, or a random selection.',
  constraints: [
    'Random selection is limited to 25 entries.',
    'NASA may return image, video, or iframe entries. Its current response does not provide a separate structured video URL; use the article permalink for those entries.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      date: z.string().optional().describe('Specific date (YYYY-MM-DD); defaults to today'),
      startDate: z
        .string()
        .optional()
        .describe('Start date (YYYY-MM-DD) for a range; cannot be combined with date'),
      endDate: z
        .string()
        .optional()
        .describe(
          'End date (YYYY-MM-DD) for a range; defaults to today when startDate is supplied'
        ),
      count: z
        .number()
        .optional()
        .describe(
          'Number of random entries, from 1 to 25; cannot be combined with date or a date range'
        )
    })
  )
  .output(
    z.object({
      entries: z
        .array(
          z.object({
            date: z.string().describe('Date of the APOD entry'),
            title: z.string().describe('APOD title'),
            explanation: z.string().describe('Scientific explanation'),
            mediaType: z
              .string()
              .describe('Provider media type, such as image, video, or iframe'),
            articleUrl: z
              .string()
              .describe(
                'NASA article permalink; this is a web page rather than a direct media file'
              ),
            mediaUrl: z
              .string()
              .optional()
              .describe(
                'Direct image media URL when supplied for an image entry; omitted when no actual media URL is documented'
              ),
            featuredImageUrl: z
              .string()
              .optional()
              .describe('Full-size featured image URL when NASA supplies hdurl'),
            postId: z.number().optional().describe('NASA WordPress post identifier'),
            copyright: z.string().optional().describe('Provider copyright information'),
            credit: z.string().optional().describe('Provider credit information'),
            alt: z.string().optional().describe('Alternative text for the entry')
          })
        )
        .describe('APOD entries with article and media URLs identified separately'),
      raw: z.any().describe('Complete, unchanged provider response')
    })
  )
  .handleInvocation(async ctx => {
    validateDate(ctx.input.date, 'Date');
    validateDateRange(ctx.input.startDate, ctx.input.endDate);
    validateInteger(ctx.input.count, 'Count', 1, 25);
    if (
      (ctx.input.date && (ctx.input.startDate || ctx.input.endDate)) ||
      (ctx.input.count !== undefined &&
        (ctx.input.date || ctx.input.startDate || ctx.input.endDate))
    ) {
      throw createApiServiceError('Choose a specific date, a date range, or a random count.');
    }
    if (ctx.input.endDate && !ctx.input.startDate) {
      throw createApiServiceError('Provide startDate when using endDate.');
    }
    let client = new NasaClient({ token: ctx.auth.token });
    let result = await client.getCurrentApod(ctx.input);
    let items = Array.isArray(result) ? result : [result];
    let entries = items.map((item: any) => ({
      date: item.date,
      title: item.title,
      explanation: item.explanation,
      mediaType: item.media_type,
      articleUrl: item.permalink ?? item.url,
      mediaUrl: item.media_type === 'image' ? (item.hdurl ?? undefined) : undefined,
      featuredImageUrl: item.hdurl ?? undefined,
      postId: item.post_id ?? undefined,
      copyright: item.copyright ?? undefined,
      credit: item.credit ?? undefined,
      alt: item.alt ?? undefined
    }));
    for (let entry of entries) {
      if (entry.mediaUrl) {
        await ctx.addAttachment({ type: 'url', url: entry.mediaUrl });
      }
    }
    return {
      output: { entries, raw: result },
      message: `Retrieved **${entries.length}** Astronomy Picture of the Day entries.`
    };
  })
  .build();

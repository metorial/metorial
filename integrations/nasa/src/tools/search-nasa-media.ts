import { SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient } from '../lib/client';
import { spec } from '../spec';

let mediaItemSchema = z.object({
  nasaId: z.string().describe('NASA unique identifier for this media item'),
  title: z.string().describe('Title of the media item'),
  description: z.string().optional().describe('Description of the media item'),
  mediaType: z.string().describe('Type of media: image, video, or audio'),
  dateCreated: z.string().optional().describe('Date the media was created'),
  center: z.string().optional().describe('NASA center that created this media'),
  keywords: z.array(z.string()).optional().describe('Associated keywords'),
  thumbnailUrl: z.string().optional().describe('URL to a thumbnail image'),
  previewUrl: z.string().optional().describe('URL to a preview')
});

export let searchNasaMedia = SlateTool.create(spec, {
  name: 'Search NASA Media Library',
  key: 'search_nasa_media',
  description: `Search NASA's Image and Video Library for photos, videos, and audio. Find media by keyword, NASA center, date range, and media type. Returns titles, descriptions, and URLs for matching media items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search query text (e.g., "mars", "apollo 11", "nebula")'),
      center: z.string().optional().describe('NASA center filter (e.g., JPL, KSC, JSC, GSFC)'),
      mediaType: z
        .enum(['image', 'video', 'audio'])
        .optional()
        .describe('Filter by media type'),
      yearStart: z.string().optional().describe('Start year for results (YYYY)'),
      yearEnd: z.string().optional().describe('End year for results (YYYY)'),
      keywords: z.string().optional().describe('Comma-separated keywords to filter by'),
      nasaId: z.string().optional().describe('Specific NASA ID to look up'),
      page: z.number().optional().describe('Page number for paginated results')
    })
  )
  .output(
    z.object({
      totalHits: z.number().optional().describe('Total number of matching results'),
      items: z.array(mediaItemSchema).describe('List of media items'),
      itemCount: z.number().describe('Number of items in this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NasaClient({ token: ctx.auth.token });

    let result = await client.searchNasaImages({
      q: ctx.input.query,
      center: ctx.input.center,
      mediaType: ctx.input.mediaType,
      yearStart: ctx.input.yearStart,
      yearEnd: ctx.input.yearEnd,
      keywords: ctx.input.keywords,
      nasaId: ctx.input.nasaId,
      page: ctx.input.page
    });

    let collection = result.collection || {};
    let totalHits = collection.metadata?.total_hits;

    let items = (collection.items || []).map((item: any) => {
      let itemData = item.data?.[0] || {};
      let links = item.links || [];
      let thumbnail = links.find((l: any) => l.rel === 'preview');

      return {
        nasaId: itemData.nasa_id,
        title: itemData.title,
        description: itemData.description,
        mediaType: itemData.media_type,
        dateCreated: itemData.date_created,
        center: itemData.center,
        keywords: itemData.keywords,
        thumbnailUrl: thumbnail?.href,
        previewUrl: item.href
      };
    });

    return {
      output: { totalHits, items, itemCount: items.length },
      message: `Found **${totalHits ?? items.length}** results${ctx.input.query ? ` for "${ctx.input.query}"` : ''}. Returned ${items.length} items.`
    };
  })
  .build();

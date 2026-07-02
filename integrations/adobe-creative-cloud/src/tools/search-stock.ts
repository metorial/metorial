import { SlateTool } from 'slates';
import { z } from 'zod';
import { StockClient } from '../lib/stock';
import { spec } from '../spec';

export let searchStock = SlateTool.create(spec, {
  name: 'Search Stock',
  key: 'search_stock',
  description: `Search Adobe Stock for images, videos, vectors, templates, and other creative assets. Filter by content type, orientation, and other criteria. Returns thumbnails, metadata, and licensing information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keywords: z.string().describe('Search keywords'),
      limit: z.number().optional().describe('Maximum results to return (default: 20)'),
      offset: z.number().optional().describe('Result offset for pagination'),
      contentType: z
        .enum(['photo', 'illustration', 'vector', 'video', 'template', '3d', 'audio'])
        .optional()
        .describe('Filter by content type'),
      orientation: z
        .enum(['horizontal', 'vertical', 'square', 'panoramic'])
        .optional()
        .describe('Filter by orientation'),
      premium: z.enum(['true', 'false', 'all']).optional().describe('Filter by premium status')
    })
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          contentId: z.string().describe('Adobe Stock content ID'),
          title: z.string().optional().describe('Asset title'),
          thumbnailUrl: z.string().optional().describe('Thumbnail image URL'),
          width: z.number().optional().describe('Asset width in pixels'),
          height: z.number().optional().describe('Asset height in pixels'),
          creatorName: z.string().optional().describe('Name of the asset creator'),
          contentType: z.string().optional().describe('Content type'),
          isLicensed: z.boolean().optional().describe('Whether the asset is already licensed'),
          category: z.string().optional().describe('Asset category')
        })
      ),
      totalResults: z.number().optional().describe('Total number of matching results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StockClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      orgId: ctx.auth.orgId
    });

    let result = await client.search({
      keywords: ctx.input.keywords,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      filters: {
        contentType: ctx.input.contentType,
        orientation: ctx.input.orientation,
        premium: ctx.input.premium
      }
    });

    let files = result.files || [];
    let results = files.map((f: any) => ({
      contentId: String(f.id),
      title: f.title,
      thumbnailUrl: f.thumbnail_url,
      width: f.width,
      height: f.height,
      creatorName: f.creator_name,
      contentType: f.content_type,
      isLicensed: f.is_licensed === 'true' || f.is_licensed === true,
      category: f.category?.name
    }));

    return {
      output: {
        results,
        totalResults: result.nb_results
      },
      message: `Found **${result.nb_results || results.length}** stock assets for "${ctx.input.keywords}". Showing ${results.length} results.`
    };
  })
  .build();

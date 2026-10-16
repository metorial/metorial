import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchImages = SlateTool.create(spec, {
  name: 'Search Images',
  key: 'search_images',
  description: `Search the All-Images.ai library of AI-generated stock images by keywords. Returns preview and full-size URLs for each matching image. Supports filtering for free-only images and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Keywords to search for'),
      filterFree: z.boolean().optional().describe('Only return free images'),
      limit: z.number().optional().describe('Number of results per page'),
      offset: z.number().optional().describe('Starting position for pagination'),
      sort: z.string().optional().describe('Provider sort expression')
    })
  )
  .output(
    z.object({
      filteredResults: z.number().optional().describe('Total number of matching images'),
      resultCountMetadata: z
        .unknown()
        .optional()
        .describe('Unmodified provider result count metadata, when provided'),
      images: z
        .array(
          z.object({
            imageId: z.string().describe('Image ID'),
            url: z.string().describe('Preview image URL'),
            urlFull: z.string().describe('Full-size image URL'),
            validated: z
              .boolean()
              .optional()
              .describe('Whether the image was validated by the team'),
            free: z.boolean().optional().describe('Whether the image is free'),
            titles: z
              .record(z.string(), z.string())
              .optional()
              .describe('Image titles by language')
          })
        )
        .describe('Matching images')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.searchImages({
      search: ctx.input.search,
      filterFree: ctx.input.filterFree,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort
    });

    return {
      output: result,
      message: `${result.filteredResults !== undefined ? `Found **${result.filteredResults}** images. ` : ''}Returned **${result.images.length}** results${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();

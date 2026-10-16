import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDownloadHistory = SlateTool.create(spec, {
  name: 'Get Download History',
  key: 'get_download_history',
  description: `List previously downloaded/purchased images with their download URLs. Supports date range filtering and pagination to find specific past purchases.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of results per page'),
      offset: z.number().optional().describe('Starting position for pagination'),
      sort: z.string().optional().describe('Provider sort expression'),
      afterCreatedAt: z
        .string()
        .optional()
        .describe('Filter images downloaded after this date (ISO 8601)'),
      beforeCreatedAt: z
        .string()
        .optional()
        .describe('Filter images downloaded before this date (ISO 8601)')
    })
  )
  .output(
    z.object({
      filteredResults: z
        .number()
        .optional()
        .describe('Total number of downloaded images matching filters'),
      resultCountMetadata: z
        .unknown()
        .optional()
        .describe('Unmodified provider result count metadata, when provided'),
      images: z
        .array(
          z.object({
            imageId: z.string().describe('Image ID'),
            previewUrl: z.string().describe('Direct URL to download preview image'),
            fullUrl: z.string().describe('Direct URL to download full image'),
            upscaleUrl: z.string().optional().describe('Direct URL to download upscale image'),
            upscaleUhdUrl: z.string().describe('Direct URL to download upscale UHD image'),
            downloadedAt: z.string().describe('Download timestamp')
          })
        )
        .describe('Downloaded images')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.getDownloadedImages({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      afterCreatedAt: ctx.input.afterCreatedAt,
      beforeCreatedAt: ctx.input.beforeCreatedAt
    });

    return {
      output: result,
      message: `${result.filteredResults !== undefined ? `Found **${result.filteredResults}** downloaded images. ` : ''}Returned **${result.images.length}** results.`
    };
  })
  .build();

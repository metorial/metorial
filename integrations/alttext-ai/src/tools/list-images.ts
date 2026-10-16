import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { imageSummarySchema, mapImage } from '../lib/schemas';
import { spec } from '../spec';

export let listImages = SlateTool.create(spec, {
  name: 'List Images',
  key: 'list_images',
  description: `Retrieve a paginated list of images from your AltText.ai library. Each image includes its alt text, language, and metadata. Use this to browse or audit processed images.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of images per page (1–100)'),
      imageUrl: z.string().optional().describe('Filter by an exact source image URL')
    })
  )
  .output(
    z.object({
      images: z.array(imageSummarySchema).describe('Image results'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Number of images per page'),
      total: z.number().describe('Total number of images in the library'),
      totalPages: z.number().optional().describe('Total result pages'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getImages({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      imageUrl: ctx.input.imageUrl
    });

    let images = result.images.map(mapImage);

    return {
      output: {
        images,
        page: result.page,
        perPage: result.per_page,
        total: result.total,
        totalPages: result.total_pages,
        raw: result.raw
      },
      message: `Retrieved **${images.length}** images (page ${result.page}, ${result.total} total).`
    };
  })
  .build();

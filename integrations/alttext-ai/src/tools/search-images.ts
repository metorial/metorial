import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchImages = SlateTool.create(spec, {
  name: 'Search Images',
  key: 'search_images',
  description: `Search for images in your AltText.ai library by keyword. Matches against alt text and image metadata. Use this to find specific images or check if alt text contains certain terms.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query to match against alt text and metadata'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      images: z
        .array(
          z.object({
            imageAssetId: z.string().describe('Unique identifier for the image'),
            imageUrl: z.string().describe('URL of the image'),
            altText: z.string().describe('Generated alt text'),
            lang: z.string().describe('Language of the alt text'),
            status: z.string().describe('Processing status'),
            createdAt: z.string().describe('When the image was processed')
          })
        )
        .describe('Matching images'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Number of results per page'),
      total: z.number().describe('Total number of matching images')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchImages({
      query: ctx.input.query,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let images = result.images.map(img => ({
      imageAssetId: img.asset_id,
      imageUrl: img.url,
      altText: img.alt_text,
      lang: img.lang,
      status: img.status,
      createdAt: img.created_at
    }));

    return {
      output: {
        images,
        page: result.page,
        perPage: result.per_page,
        total: result.total
      },
      message: `Found **${result.total}** images matching "${ctx.input.query}" (showing ${images.length} on page ${result.page}).`
    };
  })
  .build();

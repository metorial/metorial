import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      perPage: z.number().optional().describe('Number of images per page')
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
        .describe('List of images'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Number of images per page'),
      total: z.number().describe('Total number of images in the library')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getImages({
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
      message: `Retrieved **${images.length}** images (page ${result.page}, ${result.total} total).`
    };
  })
  .build();

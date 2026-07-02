import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let imageOutputSchema = z.object({
  imageAssetId: z.string().describe('Unique identifier for the image'),
  imageUrl: z.string().describe('URL of the image'),
  altText: z.string().describe('Generated alt text'),
  lang: z.string().describe('Language of the alt text'),
  status: z.string().describe('Processing status'),
  keywords: z.array(z.string()).nullable().describe('SEO keywords used'),
  negativeKeywords: z.array(z.string()).nullable().describe('Negative keywords used'),
  createdAt: z.string().describe('When the image was processed'),
  updatedAt: z.string().describe('When the image was last updated')
});

export let getImage = SlateTool.create(spec, {
  name: 'Get Image',
  key: 'get_image',
  description: `Retrieve a previously processed image and its generated alt text by asset ID. Returns the full image record including alt text, language, keywords, and processing status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      imageAssetId: z.string().describe('The asset ID of the image to retrieve')
    })
  )
  .output(imageOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let image = await client.getImage(ctx.input.imageAssetId);

    return {
      output: {
        imageAssetId: image.asset_id,
        imageUrl: image.url,
        altText: image.alt_text,
        lang: image.lang,
        status: image.status,
        keywords: image.keywords,
        negativeKeywords: image.negative_keywords,
        createdAt: image.created_at,
        updatedAt: image.updated_at
      },
      message: `Image **${image.asset_id}**: "${image.alt_text}"`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { imageDetailSchema, mapImage } from '../lib/schemas';
import { spec } from '../spec';

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
  .output(imageDetailSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let image = await client.getImage(ctx.input.imageAssetId);

    return {
      output: mapImage(image),
      message: `Image **${image.asset_id}**: "${image.alt_text}"`
    };
  })
  .build();

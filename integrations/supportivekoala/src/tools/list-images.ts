import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listImages = SlateTool.create(spec, {
  name: 'List Images',
  key: 'list_images',
  description: `List all previously generated images associated with your account. Returns each image's ID, hosted URL, template used, and timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      images: z
        .array(
          z.object({
            imageId: z.string().describe('ID of the image'),
            templateId: z.string().describe('ID of the template used'),
            imageUrl: z.string().describe('URL of the hosted image'),
            createdAt: z.string().describe('Timestamp when the image was created'),
            updatedAt: z.string().describe('Timestamp when the image was last updated')
          })
        )
        .describe('List of generated images')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let images = await client.listImages();

    let mapped = (Array.isArray(images) ? images : []).map((image: any) => ({
      imageId: image._id,
      templateId: image.template,
      imageUrl: image.imageUrl,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt
    }));

    return {
      output: {
        images: mapped
      },
      message: `Found **${mapped.length}** generated image(s).`
    };
  })
  .build();

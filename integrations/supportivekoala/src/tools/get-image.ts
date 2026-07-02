import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getImage = SlateTool.create(spec, {
  name: 'Get Image',
  key: 'get_image',
  description: `Retrieve a previously generated image by its ID. Returns the image details including the hosted URL, template used, and timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      imageId: z.string().describe('ID of the image to retrieve')
    })
  )
  .output(
    z.object({
      imageId: z.string().describe('ID of the image'),
      templateId: z.string().describe('ID of the template used to generate the image'),
      imageUrl: z.string().describe('URL of the hosted image'),
      createdAt: z.string().describe('Timestamp when the image was created'),
      updatedAt: z.string().describe('Timestamp when the image was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let image = await client.getImage(ctx.input.imageId);

    return {
      output: {
        imageId: image._id,
        templateId: image.template,
        imageUrl: image.imageUrl,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt
      },
      message: `Retrieved image **${image._id}**. URL: ${image.imageUrl}`
    };
  })
  .build();

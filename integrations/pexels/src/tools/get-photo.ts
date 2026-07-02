import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { photoSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getPhoto = SlateTool.create(spec, {
  name: 'Get Photo',
  key: 'get_photo',
  description: `Retrieve a specific photo by its Pexels ID. Returns full photo details including dimensions, photographer info, average color, alt text, and URLs for multiple image sizes (original, large, medium, small, portrait, landscape, tiny).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      photoId: z.number().describe('The Pexels ID of the photo to retrieve')
    })
  )
  .output(photoSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let photo = await client.getPhoto(ctx.input.photoId);

    return {
      output: photo,
      message: `Retrieved photo **#${photo.photoId}** by **${photo.photographer}** (${photo.width}x${photo.height}).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let listTalkingPhotos = SlateTool.create(spec, {
  name: 'List Talking Photos',
  key: 'list_talking_photos',
  description: `Retrieve all talking photos (photo avatars) in your HeyGen account. Talking photos are still images that can be animated to speak text. Their IDs can be used with character type "talking_photo" when creating avatar videos.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      talkingPhotos: z
        .array(
          z.object({
            talkingPhotoId: z.string().describe('Talking photo ID'),
            talkingPhotoName: z.string().describe('Display name'),
            previewImageUrl: z.string().nullable().describe('Preview image URL')
          })
        )
        .describe('List of talking photos')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    let result = await client.listTalkingPhotos();

    return {
      output: result,
      message: `Found **${result.talkingPhotos.length}** talking photo(s).`
    };
  })
  .build();

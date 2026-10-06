import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let listTalkingPhotos = SlateTool.create(spec, {
  name: 'List Talking Photos',
  key: 'list_talking_photos',
  description: `Retrieve a page of talking photos (photo avatars) in your HeyGen account. Talking photos are still images that can be animated to speak text. Their IDs can be used with character type "talking_photo" when creating avatar videos.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      paginationToken: z.string().optional().describe('Cursor returned by a previous page'),
      limit: z.number().int().min(1).max(50).optional().describe('Maximum items per page')
    })
  )
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
        .describe('List of talking photos'),
      paginationToken: z.string().nullable(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient(ctx.auth);

    let result = await client.listTalkingPhotos({
      ...ctx.input,
      token: ctx.input.paginationToken
    });

    return {
      output: { ...result, paginationToken: result.token },
      message: `Found **${result.talkingPhotos.length}** talking photo(s).`
    };
  })
  .build();

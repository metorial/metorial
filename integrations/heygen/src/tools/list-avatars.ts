import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let listAvatars = SlateTool.create(spec, {
  name: 'List Avatars',
  key: 'list_avatars',
  description: `Retrieve all available AI avatars in your HeyGen account, including both public and custom avatars. Returns avatar IDs needed for video generation, along with preview images and videos.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      avatars: z
        .array(
          z.object({
            avatarId: z.string().describe('Unique avatar identifier'),
            avatarName: z.string().describe('Display name of the avatar'),
            gender: z.string().describe('Gender of the avatar'),
            previewImageUrl: z.string().describe('URL to preview image'),
            previewVideoUrl: z.string().describe('URL to preview video')
          })
        )
        .describe('List of available avatars')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    let result = await client.listAvatars();

    let avatars = (result.avatars || []).map(a => ({
      avatarId: a.avatar_id,
      avatarName: a.avatar_name,
      gender: a.gender,
      previewImageUrl: a.preview_image_url,
      previewVideoUrl: a.preview_video_url
    }));

    return {
      output: { avatars },
      message: `Found **${avatars.length}** available avatars.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let listAvatars = SlateTool.create(spec, {
  name: 'List Avatars',
  key: 'list_avatars',
  description: `Retrieve a page of available AI avatars in your HeyGen account, including both public and custom avatars. Returns avatar IDs needed for video generation, along with preview images and videos.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ownership: z.enum(['public', 'private']).optional().describe('Filter avatar ownership'),
      paginationToken: z.string().optional().describe('Cursor returned by a previous page'),
      limit: z.number().int().min(1).max(50).optional().describe('Maximum items per page')
    })
  )
  .output(
    z.object({
      avatars: z
        .array(
          z.object({
            avatarId: z.string().describe('Unique avatar identifier'),
            avatarName: z.string().describe('Display name of the avatar'),
            avatarType: z
              .string()
              .describe('Avatar type, such as digital_twin or photo_avatar'),
            supportedApiEngines: z
              .array(z.string())
              .optional()
              .describe(
                'Rendering engines this avatar supports; pass one to create_avatar_video'
              ),
            gender: z.string().nullable().describe('Gender of the avatar'),
            previewImageUrl: z.string().nullable().describe('URL to preview image'),
            previewVideoUrl: z.string().nullable().describe('URL to preview video')
          })
        )
        .describe('List of available avatars'),
      paginationToken: z.string().nullable(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient(ctx.auth);

    let result = await client.listAvatars({ ...ctx.input, token: ctx.input.paginationToken });

    let avatars = (result.avatars || []).map(a => ({
      avatarId: a.id,
      avatarName: a.name,
      avatarType: a.avatar_type,
      supportedApiEngines: a.supported_api_engines,
      gender: a.gender ?? null,
      previewImageUrl: a.preview_image_url ?? null,
      previewVideoUrl: a.preview_video_url ?? null
    }));

    return {
      output: { avatars, paginationToken: result.token, hasMore: result.hasMore },
      message: `Found **${avatars.length}** available avatars.`
    };
  })
  .build();

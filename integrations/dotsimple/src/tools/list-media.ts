import { SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { spec } from '../spec';

export let listMedia = SlateTool.create(spec, {
  name: 'List Media Files',
  key: 'list_media',
  description: `List uploaded media files in the workspace with pagination. Returns file metadata including name, type, URL, and thumbnail.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      files: z
        .array(
          z.object({
            fileId: z.number().optional().describe('Numeric ID of the media file'),
            fileUuid: z.string().optional().describe('UUID of the media file'),
            name: z.string().optional().describe('File name'),
            mimeType: z.string().optional().describe('MIME type of the file'),
            type: z.string().optional().describe('File type (image, video)'),
            url: z.string().optional().describe('URL of the media file'),
            thumbUrl: z.string().optional().describe('Thumbnail URL'),
            isVideo: z.boolean().optional().describe('Whether the file is a video'),
            createdAt: z.string().optional().describe('Upload timestamp')
          })
        )
        .describe('Array of media files'),
      currentPage: z.number().optional(),
      total: z.number().optional(),
      perPage: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId
    });

    let result = await client.listMedia(ctx.input.page);
    let files = (result?.data ?? []).map((f: any) => ({
      fileId: f.id,
      fileUuid: f.uuid,
      name: f.name,
      mimeType: f.mime_type,
      type: f.type,
      url: f.url,
      thumbUrl: f.thumb_url,
      isVideo: f.is_video,
      createdAt: f.created_at
    }));

    return {
      output: {
        files,
        currentPage: result?.meta?.current_page ?? result?.current_page,
        total: result?.meta?.total ?? result?.total,
        perPage: result?.meta?.per_page ?? result?.per_page
      },
      message: `Retrieved **${files.length}** media file(s) (page ${ctx.input.page}).`
    };
  })
  .build();

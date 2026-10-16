import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireConfirmed } from '../lib/responses';
import { spec } from '../spec';

export let deleteMedia = SlateTool.create(spec, {
  name: 'Delete Media',
  key: 'delete_media',
  description: `Delete one or more media files from the team's media library. This permanently removes the files.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      mediaIds: z.array(z.string()).describe('IDs of media files to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.mediaIds.length === 0 || ctx.input.mediaIds.some(id => !id.trim())) {
      throw createApiServiceError('Provide at least one nonempty mediaIds value.');
    }
    let client = new Client({ token: ctx.auth.token });
    requireConfirmed(await client.deleteMedia(ctx.input.mediaIds));

    return {
      output: { success: true },
      message: `Deleted ${ctx.input.mediaIds.length} media file(s).`
    };
  });

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSubtitles = SlateTool.create(spec, {
  name: 'Delete Subtitles',
  key: 'delete_subtitles',
  description: `Delete all subtitle versions for a specific language on a video. Only allowed for team videos where the API user is a team admin.`,
  tags: {
    destructive: true
  },
  constraints: [
    'Only allowed for videos that belong to a team.',
    'Requires team admin permissions.',
    'Deletes ALL versions of the subtitles for the specified language.'
  ]
})
  .input(
    z.object({
      videoId: z.string().describe('The video identifier'),
      languageCode: z.string().describe('Language code of subtitles to delete (BCP-47)')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the subtitles were successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    await client.deleteSubtitles(ctx.input.videoId, ctx.input.languageCode);

    return {
      output: { deleted: true },
      message: `Deleted all subtitle versions for language \`${ctx.input.languageCode}\` on video \`${ctx.input.videoId}\`.`
    };
  })
  .build();

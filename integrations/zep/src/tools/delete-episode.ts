import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteEpisode = SlateTool.create(spec, {
  name: 'Delete Episode',
  key: 'delete_episode',
  description: `Delete an episode from the knowledge graph by its UUID. Cascading delete removes edges created solely by this episode and nodes that are no longer referenced by any other episodes.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      episodeUuid: z.string().describe('UUID of the episode to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the episode was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    await client.deleteEpisode(ctx.input.episodeUuid);
    return {
      output: { deleted: true },
      message: `Deleted episode **${ctx.input.episodeUuid}** and cascaded removal of orphaned edges/nodes.`
    };
  })
  .build();

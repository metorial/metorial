import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { spec } from '../spec';

export let deleteSource = SlateTool.create(spec, {
  name: 'Delete Source',
  key: 'delete_source',
  description: `Delete a training source from a bot. The source data will be removed from the bot's index. Sources may still appear in chat results for several minutes while being fully removed.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      botId: z.string().describe('Bot ID the source belongs to'),
      sourceId: z.string().describe('Source ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the source was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);
    await client.deleteSource(ctx.config.teamId, ctx.input.botId, ctx.input.sourceId);

    return {
      output: { deleted: true },
      message: `Deleted source \`${ctx.input.sourceId}\` from bot \`${ctx.input.botId}\``
    };
  })
  .build();

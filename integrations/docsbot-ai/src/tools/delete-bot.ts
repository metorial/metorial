import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { resolveTeamId, teamIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let deleteBot = SlateTool.create(spec, {
  name: 'Delete Bot',
  key: 'delete_bot',
  description: `Permanently delete a bot and all its associated sources and data. This action cannot be undone. Call list_teams to discover accessible team IDs.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      teamId: teamIdSchema,
      botId: z.string().describe('Bot ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the bot was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);
    await client.deleteBot(
      resolveTeamId(ctx.input.teamId, ctx.config.teamId),
      ctx.input.botId
    );

    return {
      output: { deleted: true },
      message: `Deleted bot \`${ctx.input.botId}\``
    };
  })
  .build();

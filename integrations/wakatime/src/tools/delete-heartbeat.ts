import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

export let deleteHeartbeat = SlateTool.create(spec, {
  name: 'Delete Heartbeat',
  key: 'delete_heartbeat',
  description: `Delete a specific heartbeat by its ID. Use the "Get Heartbeats" tool first to find the heartbeat ID you want to remove.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      heartbeatId: z.string().describe('ID of the heartbeat to delete'),
      date: z
        .string()
        .optional()
        .describe(
          "Heartbeat date in YYYY-MM-DD format. Provide this to use WakaTime's documented date-scoped deletion endpoint."
        )
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the heartbeat was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient(ctx.auth);

    await client.deleteHeartbeat(ctx.input.heartbeatId, ctx.input.date);

    return {
      output: {
        deleted: true
      },
      message: `Deleted heartbeat **${ctx.input.heartbeatId}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let cancelDowntime = SlateTool.create(spec, {
  name: 'Cancel Downtime',
  key: 'cancel_downtime',
  description: `Cancel a Datadog downtime by ID to resume normal monitor notifications for its target scope.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      downtimeId: z.string().describe('Downtime ID to cancel')
    })
  )
  .output(
    z.object({
      canceledDowntimeId: z.string().describe('ID of the canceled downtime')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    await client.cancelDowntime(ctx.input.downtimeId);

    return {
      output: { canceledDowntimeId: ctx.input.downtimeId },
      message: `Canceled downtime **${ctx.input.downtimeId}**`
    };
  })
  .build();

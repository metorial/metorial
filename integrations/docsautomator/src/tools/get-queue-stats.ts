import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getQueueStats = SlateTool.create(spec, {
  name: 'Get Queue Stats',
  key: 'get_queue_stats',
  description: `Returns current document generation queue metrics for the workspace, including the number of pending, processing, and completed jobs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      stats: z
        .record(z.string(), z.unknown())
        .describe(
          'Queue statistics including counts of pending, processing, and completed jobs.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getQueueStats();

    return {
      output: {
        stats: result
      },
      message: `Retrieved queue statistics.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteHeartbeatTest = SlateTool.create(spec, {
  name: 'Delete Heartbeat Test',
  key: 'delete_heartbeat_test',
  description: `Permanently delete a heartbeat monitoring check. This action cannot be undone.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the heartbeat test to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteHeartbeatTest(ctx.input.testId);

    return {
      output: { success: true },
      message: `Deleted heartbeat test **${ctx.input.testId}**.`
    };
  })
  .build();

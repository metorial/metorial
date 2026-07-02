import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteUptimeTest = SlateTool.create(spec, {
  name: 'Delete Uptime Test',
  key: 'delete_uptime_test',
  description: `Permanently delete an uptime monitoring check. This action cannot be undone and will stop all monitoring for the specified test.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the uptime test to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteUptimeTest(ctx.input.testId);

    return {
      output: { success: true },
      message: `Deleted uptime test **${ctx.input.testId}**.`
    };
  })
  .build();

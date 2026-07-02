import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getHeartbeatTest = SlateTool.create(spec, {
  name: 'Get Heartbeat Test',
  key: 'get_heartbeat_test',
  description: `Retrieve detailed information about a specific heartbeat check. Returns the heartbeat URL (which your service must ping), period configuration, status, uptime percentage, and contact groups.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the heartbeat test to retrieve')
    })
  )
  .output(
    z.object({
      test: z.record(z.string(), z.any()).describe('Heartbeat test details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getHeartbeatTest(ctx.input.testId);
    let test = result?.data ?? result;

    return {
      output: { test },
      message: `Retrieved heartbeat test **${test.name ?? ctx.input.testId}**.`
    };
  })
  .build();

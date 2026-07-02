import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createHeartbeatTest = SlateTool.create(spec, {
  name: 'Create Heartbeat Test',
  key: 'create_heartbeat_test',
  description: `Create a new heartbeat monitoring check. Heartbeat checks provide a unique URL that your service must ping within a configured period. If no ping is received within the period, the check is considered down. Useful for monitoring cron jobs, background tasks, and other periodic processes.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the heartbeat test'),
      period: z.number().describe('Expected period between pings in seconds (30 to 172800)'),
      contactGroups: z
        .array(z.string())
        .optional()
        .describe('List of contact group IDs for alerts'),
      tags: z.array(z.string()).optional().describe('Tags for the test'),
      paused: z.boolean().optional().describe('Whether the test starts paused')
    })
  )
  .output(
    z.object({
      testId: z.string().describe('ID of the newly created heartbeat test')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { contactGroups, ...rest } = ctx.input;

    let data: Record<string, any> = { ...rest };
    if (contactGroups) data.contact_groups = contactGroups;

    let result = await client.createHeartbeatTest(data);
    let testId = String(result?.data?.new_id ?? result?.new_id ?? '');

    return {
      output: { testId },
      message: `Created heartbeat test **${ctx.input.name}** (ID: ${testId}).`
    };
  })
  .build();

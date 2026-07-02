import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateHeartbeatTest = SlateTool.create(spec, {
  name: 'Update Heartbeat Test',
  key: 'update_heartbeat_test',
  description: `Update an existing heartbeat monitoring check. Modify name, period, contact groups, tags, and paused state. Only provided fields will be updated.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the heartbeat test to update'),
      name: z.string().optional().describe('New name for the test'),
      period: z
        .number()
        .optional()
        .describe('Expected period between pings in seconds (30 to 172800)'),
      contactGroups: z
        .array(z.string())
        .optional()
        .describe('List of contact group IDs for alerts'),
      tags: z.array(z.string()).optional().describe('Tags for the test'),
      paused: z.boolean().optional().describe('Whether the test is paused')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { testId, contactGroups, ...rest } = ctx.input;

    let data: Record<string, any> = { ...rest };
    if (contactGroups) data.contact_groups = contactGroups;

    await client.updateHeartbeatTest(testId, data);

    return {
      output: { success: true },
      message: `Updated heartbeat test **${testId}** successfully.`
    };
  })
  .build();

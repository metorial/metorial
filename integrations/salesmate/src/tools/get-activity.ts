import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getActivity = SlateTool.create(spec, {
  name: 'Get Activity',
  key: 'get_activity',
  description: `Retrieve an activity by its ID from Salesmate. Returns all fields including type, due date, and associated records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      activityId: z.string().describe('ID of the activity to retrieve')
    })
  )
  .output(
    z.object({
      activity: z
        .record(z.string(), z.unknown())
        .describe('Full activity record with all fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getActivity(ctx.input.activityId);
    let activity = result?.Data ?? result;

    return {
      output: { activity },
      message: `Retrieved activity \`${ctx.input.activityId}\`.`
    };
  })
  .build();

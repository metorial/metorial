import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteActivity = SlateTool.create(spec, {
  name: 'Delete Activity',
  key: 'delete_activity',
  description: `Delete an activity from Salesmate by its ID. This action is permanent and cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      activityId: z.string().describe('ID of the activity to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteActivity(ctx.input.activityId);

    return {
      output: { success: true },
      message: `Activity \`${ctx.input.activityId}\` deleted.`
    };
  })
  .build();

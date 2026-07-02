import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteSalesActivity = SlateTool.create(spec, {
  name: 'Delete Sales Activity',
  key: 'delete_sales_activity',
  description: `Delete a sales activity from Freshsales by its ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      activityId: z.number().describe('ID of the sales activity to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteSalesActivity(ctx.input.activityId);

    return {
      output: { deleted: true },
      message: `Sales activity **${ctx.input.activityId}** deleted successfully.`
    };
  })
  .build();

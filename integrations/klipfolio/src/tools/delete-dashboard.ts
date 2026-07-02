import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDashboard = SlateTool.create(spec, {
  name: 'Delete Dashboard',
  key: 'delete_dashboard',
  description: `Permanently delete a dashboard (tab) from Klipfolio. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      dashboardId: z.string().describe('ID of the dashboard to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteTab(ctx.input.dashboardId);

    return {
      output: { success: true },
      message: `Deleted dashboard \`${ctx.input.dashboardId}\`.`
    };
  })
  .build();

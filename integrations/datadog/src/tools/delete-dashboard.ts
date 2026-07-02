import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteDashboard = SlateTool.create(spec, {
  name: 'Delete Dashboard',
  key: 'delete_dashboard',
  description: `Delete a Datadog dashboard by ID. Use this to clean up dashboards that were created for temporary investigations or automation runs.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      dashboardId: z.string().describe('Dashboard ID to delete')
    })
  )
  .output(
    z.object({
      deletedDashboardId: z.string().describe('ID of the deleted dashboard')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    await client.deleteDashboard(ctx.input.dashboardId);

    return {
      output: { deletedDashboardId: ctx.input.dashboardId },
      message: `Deleted dashboard **${ctx.input.dashboardId}**`
    };
  })
  .build();

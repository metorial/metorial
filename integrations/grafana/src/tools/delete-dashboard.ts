import { SlateTool } from 'slates';
import { z } from 'zod';
import { GrafanaClient } from '../lib/client';
import { spec } from '../spec';

export let deleteDashboard = SlateTool.create(spec, {
  name: 'Delete Dashboard',
  key: 'delete_dashboard',
  description: `Permanently delete a dashboard by its UID. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      dashboardUid: z.string().describe('UID of the dashboard to delete')
    })
  )
  .output(
    z.object({
      title: z.string().optional().describe('Title of the deleted dashboard'),
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.deleteDashboard(ctx.input.dashboardUid);

    return {
      output: {
        title: result.title,
        message: result.message || `Dashboard ${ctx.input.dashboardUid} deleted.`
      },
      message: `Dashboard **${result.title || ctx.input.dashboardUid}** has been deleted.`
    };
  })
  .build();

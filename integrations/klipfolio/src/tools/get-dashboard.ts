import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDashboard = SlateTool.create(spec, {
  name: 'Get Dashboard',
  key: 'get_dashboard',
  description: `Retrieve detailed information about a specific dashboard including its layout, klip instances, and share rights.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dashboardId: z.string().describe('ID of the dashboard to retrieve'),
      includeDetails: z
        .boolean()
        .optional()
        .describe('Include klip instances, share rights, and layout')
    })
  )
  .output(
    z.object({
      dashboardId: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      createdBy: z.string().optional(),
      lastUpdated: z.string().optional(),
      klipInstances: z.array(z.any()).optional(),
      shareRights: z.array(z.any()).optional(),
      layout: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let tab = await client.getTab(ctx.input.dashboardId, ctx.input.includeDetails);

    let output: any = {
      dashboardId: tab?.id,
      name: tab?.name,
      description: tab?.description,
      createdBy: tab?.created_by,
      lastUpdated: tab?.last_updated
    };

    if (ctx.input.includeDetails) {
      output.klipInstances = tab?.klip_instances;
      output.shareRights = tab?.share_rights;

      let layout = await client.getTabLayout(ctx.input.dashboardId);
      output.layout = layout;
    }

    return {
      output,
      message: `Retrieved dashboard **${tab?.name || ctx.input.dashboardId}**.`
    };
  })
  .build();

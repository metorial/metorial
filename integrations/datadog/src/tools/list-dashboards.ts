import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listDashboards = SlateTool.create(spec, {
  name: 'List Dashboards',
  key: 'list_dashboards',
  description: `List all Datadog dashboards in the organization. Returns a summary of each dashboard including title, layout type, and author.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      dashboards: z
        .array(
          z.object({
            dashboardId: z.string(),
            title: z.string(),
            layoutType: z.string().optional(),
            description: z.string().optional(),
            url: z.string().optional(),
            authorHandle: z.string().optional(),
            createdAt: z.string().optional(),
            modifiedAt: z.string().optional()
          })
        )
        .describe('List of dashboards')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.listDashboards();

    let dashboards = (result.dashboards || []).map((d: any) => ({
      dashboardId: d.id,
      title: d.title,
      layoutType: d.layout_type,
      description: d.description,
      url: d.url,
      authorHandle: d.author_handle,
      createdAt: d.created_at,
      modifiedAt: d.modified_at
    }));

    return {
      output: { dashboards },
      message: `Found **${dashboards.length}** dashboards`
    };
  })
  .build();

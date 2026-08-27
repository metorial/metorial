import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let listDashboards = SlateTool.create(spec, {
  name: 'List Dashboards',
  key: 'list_dashboards',
  description: `List dashboards in Metabase with optional filtering.
Returns all dashboards, dashboards you created, or archived dashboards.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .enum(['all', 'mine', 'archived', 'fav'])
        .optional()
        .describe('Filter to apply; fav is retained only for input compatibility')
    })
  )
  .output(
    z.object({
      dashboards: z.array(
        z.object({
          dashboardId: z.number().describe('ID of the dashboard'),
          name: z.string().describe('Name of the dashboard'),
          description: z.string().nullable().describe('Description'),
          collectionId: z.number().nullable().describe('Collection ID'),
          creatorId: z.number().optional().describe('Creator user ID')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.filter === 'fav') {
      throw createApiServiceError(
        'Current Metabase versions do not support filtering the dashboard list by bookmarks. Use all, mine, or archived.',
        { reason: 'metabase_dashboard_filter_unsupported' }
      );
    }
    let client = new MetabaseClient(ctx.auth);

    let dashboards = await client.listDashboards({ filter: ctx.input.filter });
    let items = Array.isArray(dashboards) ? dashboards : [];

    let output = items.map((d: any) => ({
      dashboardId: d.id,
      name: d.name,
      description: d.description ?? null,
      collectionId: d.collection_id ?? null,
      creatorId: d.creator_id
    }));

    return {
      output: { dashboards: output },
      message: `Found **${output.length}** dashboard(s)${ctx.input.filter ? ` (filter: ${ctx.input.filter})` : ''}`
    };
  })
  .build();

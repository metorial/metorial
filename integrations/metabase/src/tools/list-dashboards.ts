import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let listDashboards = SlateTool.create(spec, {
  name: 'List Dashboards',
  key: 'list_dashboards',
  description: `List dashboards in Metabase with optional filtering.
Returns all dashboards, your dashboards, favorites, or archived dashboards.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .enum(['all', 'mine', 'fav', 'archived'])
        .optional()
        .describe('Filter to apply when listing dashboards')
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
    let client = new MetabaseClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

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

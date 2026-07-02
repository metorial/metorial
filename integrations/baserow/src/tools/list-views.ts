import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listViews = SlateTool.create(spec, {
  name: 'List Views',
  key: 'list_views',
  description: `List all views for a Baserow table. Returns view IDs, names, types (grid, gallery, form, kanban, calendar, timeline), and configuration. View IDs can be used to scope row queries to a specific view's filters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableId: z.number().describe('The ID of the table to list views from')
    })
  )
  .output(
    z.object({
      views: z
        .array(
          z
            .object({
              viewId: z.number().describe('View ID'),
              name: z.string().describe('View name'),
              type: z
                .string()
                .describe('View type (grid, gallery, form, kanban, calendar, timeline)'),
              order: z.number().describe('Display order'),
              tableId: z.number().describe('Parent table ID')
            })
            .catchall(z.any())
        )
        .describe('Array of view objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      baseUrl: ctx.config.baseUrl
    });

    let views = await client.listViews(ctx.input.tableId);

    return {
      output: {
        views: views.map((v: any) => ({
          viewId: v.id,
          name: v.name,
          type: v.type,
          order: v.order,
          tableId: v.table_id,
          ...v
        }))
      },
      message: `Found **${views.length}** view(s) in table ${ctx.input.tableId}.`
    };
  })
  .build();

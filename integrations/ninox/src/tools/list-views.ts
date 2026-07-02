import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listViews = SlateTool.create(spec, {
  name: 'List Views',
  key: 'list_views',
  description: `List views defined in a database or on a specific table. Views represent saved configurations for displaying and filtering data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      databaseId: z.string().describe('ID of the database'),
      tableId: z
        .string()
        .optional()
        .describe(
          'ID of a specific table to list views for. If omitted, lists all database-level views.'
        )
    })
  )
  .output(
    z.object({
      views: z
        .array(
          z.object({
            viewId: z.string().describe('Unique identifier of the view'),
            caption: z.string().optional().describe('Display name of the view'),
            type: z.string().optional().describe('Type identifier of the view'),
            order: z.number().optional().describe('Sort order of the view'),
            viewConfig: z
              .record(z.string(), z.any())
              .optional()
              .describe('View configuration (sort, columns, etc.)')
          })
        )
        .describe('List of views'),
      count: z.number().describe('Number of views found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let views: any;
    if (ctx.input.tableId) {
      views = await client.listTableViews(
        ctx.input.teamId,
        ctx.input.databaseId,
        ctx.input.tableId
      );
    } else {
      views = await client.listDatabaseViews(ctx.input.teamId, ctx.input.databaseId);
    }

    return {
      output: {
        views: views.map((v: any) => ({
          viewId: v.id,
          caption: v.caption,
          type: v.type,
          order: v.order,
          viewConfig: v.config
        })),
        count: views.length
      },
      message: ctx.input.tableId
        ? `Found **${views.length}** view(s) for table **${ctx.input.tableId}**.`
        : `Found **${views.length}** view(s) in the database.`
    };
  })
  .build();

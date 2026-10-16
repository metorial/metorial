import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { optionalBoolean, requireString, responseList } from '../lib/schemas';
import { spec } from '../spec';

export let listViews = SlateTool.create(spec, {
  name: 'List Views',
  key: 'list_views',
  description: `List all views for a NocoDB table. Views include Grid, Gallery, Form, Kanban, and Calendar types. Each view provides a filtered/sorted perspective of the table data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableId: z.string().describe('The table ID (prefixed with m)')
    })
  )
  .output(
    z.object({
      views: z
        .array(
          z.object({
            viewId: z.string().describe('View ID'),
            title: z.string().describe('View title'),
            type: z
              .number()
              .optional()
              .describe('View type number (1=Form, 2=Gallery, 3=Grid, 4=Kanban, 5=Calendar)'),
            isDefault: z.boolean().optional().describe('Whether this is the default view')
          })
        )
        .describe('Array of view objects'),
      raw: z.any().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let result = await client.listViews(ctx.input.tableId);
    let list = responseList(result, 'views');
    let views = list.map((v: any) => ({
      viewId: requireString(v.id, 'viewId'),
      title: requireString(v.title, 'v.title'),
      type: v.type,
      isDefault: optionalBoolean(v.is_default)
    }));

    return {
      output: { views, raw: result },
      message: `Found **${views.length}** view(s) for table \`${ctx.input.tableId}\`.`
    };
  })
  .build();

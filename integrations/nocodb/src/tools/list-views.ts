import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
        .describe('Array of view objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let result = await client.listViews(ctx.input.tableId);
    let list = result?.list ?? result ?? [];
    let views = (Array.isArray(list) ? list : []).map((v: any) => ({
      viewId: v.id,
      title: v.title ?? '',
      type: v.type,
      isDefault: v.is_default ?? undefined
    }));

    return {
      output: { views },
      message: `Found **${views.length}** view(s) for table \`${ctx.input.tableId}\`.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { DatabaseClient } from '../lib/client';
import { collection, dbId, nativeView, tblId } from '../lib/schemas';
import { connection, fail, z } from '../lib/validation';
import { spec } from '../spec';
export const listTableViews = SlateTool.create(spec, {
  name: 'List Table Views',
  key: 'list_table_views',
  description:
    'Discover exact view IDs for the viewId filter in get_records. Discover the database and table with list_databases and list_tables.',
  tags: { readOnly: true }
})
  .input(z.object({ databaseId: dbId, tableId: tblId }))
  .output(
    z.object({
      views: z.array(
        z.object({
          viewId: z.string(),
          tableId: z.string(),
          name: z.string(),
          description: z.string().nullable().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const views = collection(
      nativeView,
      await new DatabaseClient(connection(ctx.auth, ctx.config)).listViews(
        ctx.input.databaseId,
        ctx.input.tableId
      )
    );
    if (views.some(v => v.tableId !== ctx.input.tableId))
      fail('Softr returned a view from another table.', 'identity_mismatch');
    return {
      output: {
        views: views.map(v => ({
          viewId: v.id,
          tableId: v.tableId,
          name: v.name,
          description: v.description,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt
        }))
      },
      message: 'Returned native table views.'
    };
  })
  .build();

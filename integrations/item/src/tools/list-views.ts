import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listViews = SlateTool.create(spec, {
  name: 'List Views',
  key: 'list_views',
  description:
    'List shared views configured for an item object type. Views capture saved filters, sorting, and visible columns from the item UI.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectType: z
        .string()
        .describe('Object type slug such as "contacts", "companies", or a custom object slug')
    })
  )
  .output(
    z.object({
      views: z.array(
        z.object({
          viewId: z.string().describe('Shared view ID'),
          name: z.string().describe('View name'),
          viewType: z.string().describe('View layout type such as table or kanban'),
          columns: z.array(z.string()).describe('Columns configured on the view')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let views = await client.listViews(ctx.input.objectType);

    return {
      output: {
        views: views.map((view: any) => ({
          viewId: view.id,
          name: view.name,
          viewType: view.view_type,
          columns: view.columns ?? []
        }))
      },
      message: `Retrieved **${views.length}** shared view(s) for **${ctx.input.objectType}**.`
    };
  })
  .build();

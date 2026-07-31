import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateObjectType } from '../lib/validation';
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
        .trim()
        .min(1)
        .describe('Object type slug such as "contacts", "companies", or a custom object slug')
    })
  )
  .output(
    z.object({
      views: z.array(
        z.object({
          viewId: z.string().uuid().describe('Shared view UUID'),
          name: z.string().describe('View name'),
          viewType: z.enum(['table', 'kanban']).describe('Documented view layout type'),
          columns: z.array(z.string()).describe('Columns configured on the view')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    validateObjectType(ctx.input.objectType);
    let client = new Client({ token: ctx.auth.token });
    let views = await client.listViews(ctx.input.objectType);

    return {
      output: {
        views: views.map(view => ({
          viewId: view.id,
          name: view.name,
          viewType: view.view_type,
          columns: view.columns
        }))
      },
      message: `Retrieved **${views.length}** shared view(s) for **${ctx.input.objectType}**.`
    };
  })
  .build();

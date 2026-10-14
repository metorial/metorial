import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let listFormItems = SlateTool.create(spec, {
  name: 'List Form Items',
  key: 'list_form_items',
  description:
    'Lists input fields with their identifiers, labels, data types, and choice options. Use the identifiers as field keys when adding, updating, or pre-filling results. Call list_forms to discover form names.',
  tags: { readOnly: true }
})
  .input(z.object({ formName: z.string().describe('Form name from list_forms') }))
  .output(z.object({ items: z.array(z.record(z.string(), z.unknown())) }))
  .handleInvocation(async ctx => {
    let client = new FormdeskClient(ctx.auth);
    let items = await client.getFormItems(ctx.input.formName);
    return {
      output: { items },
      message: `Found **${items.length}** input field(s) for "${ctx.input.formName}".`
    };
  })
  .build();

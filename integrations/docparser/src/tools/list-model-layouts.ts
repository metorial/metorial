import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listModelLayouts = SlateTool.create(spec, {
  name: 'List Model Layouts',
  key: 'list_model_layouts',
  description: `List all Model Layouts (templates) configured within a specific Document Parser. Model Layouts define extraction rules and templates used during document parsing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      parserId: z.string().describe('ID of the Document Parser to list layouts for')
    })
  )
  .output(
    z.object({
      layouts: z
        .array(
          z.object({
            layoutId: z.string().describe('Unique identifier of the layout'),
            label: z.string().describe('Human-readable label of the layout')
          })
        )
        .describe('List of model layouts in the parser')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let layouts = await client.listModelLayouts(ctx.input.parserId);

    return {
      output: {
        layouts: layouts.map(l => ({
          layoutId: l.layoutId,
          label: l.label
        }))
      },
      message: `Found **${layouts.length}** model layout(s) for parser \`${ctx.input.parserId}\`.`
    };
  })
  .build();

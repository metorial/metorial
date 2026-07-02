import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

export let createSubitemTool = SlateTool.create(spec, {
  name: 'Create Sub-item',
  key: 'create_subitem',
  description: `Create a sub-item under a parent item. Sub-items are nested items that appear within the parent item. Optionally set initial column values.`,
  instructions: [
    'Column values use Monday.com column value JSON format, same as regular items.'
  ]
})
  .input(
    z.object({
      parentItemId: z.string().describe('ID of the parent item'),
      itemName: z.string().describe('Name of the new sub-item'),
      columnValues: z
        .record(z.string(), z.any())
        .optional()
        .describe('Column values as a JSON object mapping column IDs to values'),
      createLabelsIfMissing: z
        .boolean()
        .optional()
        .describe('Auto-create missing status/dropdown labels')
    })
  )
  .output(
    z.object({
      subitemId: z.string().describe('ID of the newly created sub-item'),
      name: z.string().describe('Name of the sub-item'),
      columnValues: z
        .array(
          z.object({
            columnId: z.string(),
            type: z.string(),
            text: z.string().nullable(),
            value: z.string().nullable()
          })
        )
        .describe('Set column values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });

    let subitem = await client.createSubitem({
      parentItemId: ctx.input.parentItemId,
      itemName: ctx.input.itemName,
      columnValues: ctx.input.columnValues,
      createLabelsIfMissing: ctx.input.createLabelsIfMissing
    });

    return {
      output: {
        subitemId: String(subitem.id),
        name: subitem.name,
        columnValues: (subitem.column_values || []).map((cv: any) => ({
          columnId: cv.id,
          type: cv.type,
          text: cv.text || null,
          value: cv.value || null
        }))
      },
      message: `Created sub-item **${subitem.name}** (ID: ${subitem.id}) under parent item ${ctx.input.parentItemId}.`
    };
  })
  .build();

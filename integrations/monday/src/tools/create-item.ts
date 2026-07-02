import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

export let createItemTool = SlateTool.create(spec, {
  name: 'Create Item',
  key: 'create_item',
  description: `Create a new item (row) on a Monday.com board. Optionally place it in a specific group and set initial column values. Column values should be a JSON object mapping column IDs to their values, formatted per Monday.com's column value specification.`,
  instructions: [
    'Column values must use Monday.com column value JSON format. For example: {"status": {"label": "Done"}, "date4": {"date": "2024-01-15"}}',
    'Use createLabelsIfMissing to auto-create missing status/dropdown labels.'
  ]
})
  .input(
    z.object({
      boardId: z.string().describe('Board ID to create the item on'),
      itemName: z.string().describe('Name of the new item'),
      groupId: z.string().optional().describe('Group ID to place the item in'),
      columnValues: z
        .record(z.string(), z.any())
        .optional()
        .describe('Column values as a JSON object mapping column IDs to their values'),
      createLabelsIfMissing: z
        .boolean()
        .optional()
        .describe('Auto-create missing status/dropdown labels')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('ID of the newly created item'),
      name: z.string().describe('Name of the item'),
      groupId: z.string().nullable().describe('Group ID'),
      groupTitle: z.string().nullable().describe('Group title'),
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

    let item = await client.createItem({
      boardId: ctx.input.boardId,
      itemName: ctx.input.itemName,
      groupId: ctx.input.groupId,
      columnValues: ctx.input.columnValues,
      createLabelsIfMissing: ctx.input.createLabelsIfMissing
    });

    return {
      output: {
        itemId: String(item.id),
        name: item.name,
        groupId: item.group?.id || null,
        groupTitle: item.group?.title || null,
        columnValues: (item.column_values || []).map((cv: any) => ({
          columnId: cv.id,
          type: cv.type,
          text: cv.text || null,
          value: cv.value || null
        }))
      },
      message: `Created item **${item.name}** (ID: ${item.id}) on board ${ctx.input.boardId}.`
    };
  })
  .build();

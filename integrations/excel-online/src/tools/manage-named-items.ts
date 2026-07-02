import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExcelClient } from '../lib/client';
import { spec } from '../spec';

export let manageNamedItems = SlateTool.create(spec, {
  name: 'Manage Named Items',
  key: 'manage_named_items',
  description: `List, get, or create named ranges and constants in an Excel workbook. Named items allow referencing specific ranges or values by friendly names. You can also retrieve the range data associated with a named item.`,
  instructions: [
    'Use "list" to see all named items at the workbook or worksheet level.',
    'Use "get" to retrieve a specific named item and its value/type.',
    'Use "getRange" to get the cell range data referenced by a named item.',
    'Use "create" to define a new named item (range reference or formula).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      workbookItemId: z.string().describe('The Drive item ID of the Excel workbook file'),
      action: z.enum(['list', 'get', 'getRange', 'create']).describe('Operation to perform'),
      name: z.string().optional().describe('Named item name (required for get, getRange)'),
      worksheetIdOrName: z
        .string()
        .optional()
        .describe('Worksheet ID or name to scope the named item to (for list or create)'),
      reference: z
        .string()
        .optional()
        .describe('Range reference formula (e.g., "Sheet1!$A$1:$D$10") for create'),
      comment: z.string().optional().describe('Comment for the named item (for create)'),
      sessionId: z.string().optional().describe('Optional workbook session ID')
    })
  )
  .output(
    z.object({
      namedItems: z
        .array(
          z.object({
            name: z.string(),
            type: z.string(),
            value: z.any(),
            comment: z.string().optional(),
            visible: z.boolean()
          })
        )
        .optional()
        .describe('List of named items'),
      namedItem: z
        .object({
          name: z.string(),
          type: z.string(),
          value: z.any(),
          comment: z.string().optional(),
          visible: z.boolean()
        })
        .optional()
        .describe('Named item details'),
      range: z
        .object({
          address: z.string(),
          values: z.array(z.array(z.any())),
          rowCount: z.number(),
          columnCount: z.number()
        })
        .optional()
        .describe('Range data for named item')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExcelClient({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId,
      sessionId: ctx.input.sessionId
    });

    let mapNamedItem = (ni: any) => ({
      name: ni.name,
      type: ni.type,
      value: ni.value,
      comment: ni.comment,
      visible: ni.visible
    });

    switch (ctx.input.action) {
      case 'list': {
        let items = await client.listNamedItems(
          ctx.input.workbookItemId,
          ctx.input.worksheetIdOrName
        );
        return {
          output: { namedItems: items.map(mapNamedItem) },
          message: `Found **${items.length}** named item(s).`
        };
      }
      case 'get': {
        if (!ctx.input.name) throw new Error('name is required for get action');
        let item = await client.getNamedItem(ctx.input.workbookItemId, ctx.input.name);
        return {
          output: { namedItem: mapNamedItem(item) },
          message: `Retrieved named item **${item.name}** (${item.type}).`
        };
      }
      case 'getRange': {
        if (!ctx.input.name) throw new Error('name is required for getRange action');
        let range = await client.getNamedItemRange(ctx.input.workbookItemId, ctx.input.name);
        return {
          output: {
            range: {
              address: range.address,
              values: range.values,
              rowCount: range.rowCount,
              columnCount: range.columnCount
            }
          },
          message: `Retrieved range **${range.address}** for named item **${ctx.input.name}** (${range.rowCount} × ${range.columnCount}).`
        };
      }
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required for create action');
        if (!ctx.input.reference) throw new Error('reference is required for create action');
        let normalizedReference = ctx.input.reference.startsWith('=')
          ? ctx.input.reference
          : `=${ctx.input.reference}`;
        let item = await client.addNamedItem(
          ctx.input.workbookItemId,
          ctx.input.name,
          normalizedReference,
          ctx.input.comment,
          ctx.input.worksheetIdOrName
        );
        return {
          output: { namedItem: mapNamedItem(item) },
          message: `Created named item **${item.name}**.`
        };
      }
    }
  })
  .build();

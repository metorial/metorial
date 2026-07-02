import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let manageViews = SlateTool.create(spec, {
  name: 'Manage Views',
  key: 'manage_views',
  description: `Create, list, update, delete, or convert named views on a Gigasheet sheet. Views save specific filter, sort, grouping, and aggregation configurations that can be reapplied. Views can also be converted to linked sheets.`
})
  .input(
    z.object({
      sheetHandle: z.string().describe('Handle of the sheet'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'convert_to_linked_sheet'])
        .describe('View action to perform'),
      viewId: z
        .string()
        .optional()
        .describe('View ID (required for get, update, delete, convert_to_linked_sheet)'),
      name: z.string().optional().describe('View name (for create or update)'),
      filterModel: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Filter model for the view'),
      sortModel: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Sort model for the view'),
      columnState: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Column visibility/state for the view'),
      groupColumns: z.array(z.string()).optional().describe('Group columns for the view'),
      aggregations: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Aggregation settings for the view')
    })
  )
  .output(
    z.object({
      result: z.unknown().describe('View operation result'),
      success: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });
    let result: unknown;

    switch (ctx.input.action) {
      case 'list':
        result = await client.listViews(ctx.input.sheetHandle);
        break;

      case 'get':
        if (!ctx.input.viewId) throw new Error('viewId is required for get');
        result = await client.getView(ctx.input.sheetHandle, ctx.input.viewId);
        break;

      case 'create':
        if (!ctx.input.name) throw new Error('name is required for create');
        result = await client.createView(ctx.input.sheetHandle, {
          name: ctx.input.name,
          filterModel: ctx.input.filterModel,
          sortModel: ctx.input.sortModel,
          columnState: ctx.input.columnState,
          groupColumns: ctx.input.groupColumns,
          aggregations: ctx.input.aggregations
        });
        break;

      case 'update':
        if (!ctx.input.viewId) throw new Error('viewId is required for update');
        result = await client.updateView(ctx.input.sheetHandle, ctx.input.viewId, {
          name: ctx.input.name,
          filterModel: ctx.input.filterModel,
          sortModel: ctx.input.sortModel,
          columnState: ctx.input.columnState,
          groupColumns: ctx.input.groupColumns,
          aggregations: ctx.input.aggregations
        });
        break;

      case 'delete':
        if (!ctx.input.viewId) throw new Error('viewId is required for delete');
        await client.deleteView(ctx.input.sheetHandle, ctx.input.viewId);
        result = { deleted: true };
        break;

      case 'convert_to_linked_sheet':
        if (!ctx.input.viewId)
          throw new Error('viewId is required for convert_to_linked_sheet');
        result = await client.createLinkedSheetFromView(
          ctx.input.sheetHandle,
          ctx.input.viewId
        );
        break;
    }

    return {
      output: {
        result,
        success: true
      },
      message: `View **${ctx.input.action}** completed successfully.`
    };
  })
  .build();

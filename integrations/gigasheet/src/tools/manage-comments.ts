import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let manageComments = SlateTool.create(spec, {
  name: 'Manage Comments',
  key: 'manage_comments',
  description: `Add, retrieve, or delete comments on a Gigasheet sheet. Supports both column-level and cell-level comments.`
})
  .input(
    z.object({
      sheetHandle: z.string().describe('Handle of the sheet'),
      action: z
        .enum([
          'get_all',
          'add_column_comment',
          'add_cell_comment',
          'delete_column_comment',
          'delete_cell_comment'
        ])
        .describe('Comment action to perform'),
      columnName: z.string().optional().describe('Column name (for column or cell comments)'),
      rowId: z.string().optional().describe('Row ID (for cell comments)'),
      commentText: z.string().optional().describe('Comment text (for add actions)'),
      commentId: z.string().optional().describe('Comment ID (for delete actions)')
    })
  )
  .output(
    z.object({
      result: z.unknown().describe('Comment operation result'),
      success: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });
    let result: unknown;

    switch (ctx.input.action) {
      case 'get_all':
        result = await client.getAllComments(ctx.input.sheetHandle);
        break;

      case 'add_column_comment':
        if (!ctx.input.columnName || !ctx.input.commentText) {
          throw new Error('columnName and commentText are required for add_column_comment');
        }
        result = await client.addColumnComment(ctx.input.sheetHandle, {
          column: ctx.input.columnName,
          comment: ctx.input.commentText
        });
        break;

      case 'add_cell_comment':
        if (!ctx.input.columnName || !ctx.input.rowId || !ctx.input.commentText) {
          throw new Error(
            'columnName, rowId, and commentText are required for add_cell_comment'
          );
        }
        result = await client.addCellComment(
          ctx.input.sheetHandle,
          ctx.input.columnName,
          ctx.input.rowId,
          ctx.input.commentText
        );
        break;

      case 'delete_column_comment':
        if (!ctx.input.commentId) {
          throw new Error('commentId is required for delete_column_comment');
        }
        await client.deleteColumnComment(ctx.input.sheetHandle, ctx.input.commentId);
        result = { deleted: true };
        break;

      case 'delete_cell_comment':
        if (!ctx.input.columnName || !ctx.input.rowId || !ctx.input.commentId) {
          throw new Error(
            'columnName, rowId, and commentId are required for delete_cell_comment'
          );
        }
        await client.deleteCellComment(
          ctx.input.sheetHandle,
          ctx.input.columnName,
          ctx.input.rowId,
          ctx.input.commentId
        );
        result = { deleted: true };
        break;
    }

    return {
      output: {
        result,
        success: true
      },
      message: `Comment **${ctx.input.action}** completed successfully.`
    };
  })
  .build();

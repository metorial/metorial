import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExcelClient } from '../lib/client';
import { spec } from '../spec';

export let manageWorksheets = SlateTool.create(spec, {
  name: 'Manage Worksheets',
  key: 'manage_worksheets',
  description: `List, create, update, or delete worksheets in an Excel workbook. Use this to manage the sheet structure of a workbook — rename sheets, reorder them, change visibility, add new ones, or remove existing ones.`,
  instructions: [
    'Use action "list" to see all worksheets in a workbook.',
    'Use action "get" to retrieve details of a specific worksheet by its ID or name.',
    'Use action "create" to add a new worksheet, optionally with a name.',
    'Use action "update" to rename, reorder, or change visibility of a worksheet.',
    'Use action "delete" to remove a worksheet permanently.'
  ],
  constraints: [
    'A workbook must have at least one visible worksheet; deleting the last one will fail.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      workbookItemId: z.string().describe('The Drive item ID of the Excel workbook file'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The operation to perform'),
      worksheetIdOrName: z
        .string()
        .optional()
        .describe('Worksheet ID or name (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('New name for the worksheet (for create or update)'),
      position: z
        .number()
        .optional()
        .describe('Zero-based position index for reordering (for update)'),
      visibility: z
        .enum(['Visible', 'Hidden', 'VeryHidden'])
        .optional()
        .describe('Visibility state (for update)'),
      sessionId: z
        .string()
        .optional()
        .describe('Optional workbook session ID for batch operations')
    })
  )
  .output(
    z.object({
      worksheets: z
        .array(
          z.object({
            worksheetId: z.string(),
            name: z.string(),
            position: z.number(),
            visibility: z.string()
          })
        )
        .optional()
        .describe('List of worksheets (for list action)'),
      worksheet: z
        .object({
          worksheetId: z.string(),
          name: z.string(),
          position: z.number(),
          visibility: z.string()
        })
        .optional()
        .describe('Worksheet details (for get, create, update actions)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the worksheet was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExcelClient({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId,
      sessionId: ctx.input.sessionId
    });

    let mapWorksheet = (ws: any) => ({
      worksheetId: ws.id,
      name: ws.name,
      position: ws.position,
      visibility: ws.visibility
    });

    switch (ctx.input.action) {
      case 'list': {
        let worksheets = await client.listWorksheets(ctx.input.workbookItemId);
        return {
          output: { worksheets: worksheets.map(mapWorksheet) },
          message: `Found **${worksheets.length}** worksheet(s) in the workbook.`
        };
      }
      case 'get': {
        if (!ctx.input.worksheetIdOrName)
          throw new Error('worksheetIdOrName is required for get action');
        let ws = await client.getWorksheet(
          ctx.input.workbookItemId,
          ctx.input.worksheetIdOrName
        );
        return {
          output: { worksheet: mapWorksheet(ws) },
          message: `Retrieved worksheet **${ws.name}**.`
        };
      }
      case 'create': {
        let ws = await client.addWorksheet(ctx.input.workbookItemId, ctx.input.name);
        return {
          output: { worksheet: mapWorksheet(ws) },
          message: `Created worksheet **${ws.name}**.`
        };
      }
      case 'update': {
        if (!ctx.input.worksheetIdOrName)
          throw new Error('worksheetIdOrName is required for update action');
        let props: any = {};
        if (ctx.input.name !== undefined) props.name = ctx.input.name;
        if (ctx.input.position !== undefined) props.position = ctx.input.position;
        if (ctx.input.visibility !== undefined) props.visibility = ctx.input.visibility;
        let ws = await client.updateWorksheet(
          ctx.input.workbookItemId,
          ctx.input.worksheetIdOrName,
          props
        );
        return {
          output: { worksheet: mapWorksheet(ws) },
          message: `Updated worksheet **${ws.name}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.worksheetIdOrName)
          throw new Error('worksheetIdOrName is required for delete action');
        await client.deleteWorksheet(ctx.input.workbookItemId, ctx.input.worksheetIdOrName);
        return {
          output: { deleted: true },
          message: `Deleted worksheet **${ctx.input.worksheetIdOrName}**.`
        };
      }
    }
  })
  .build();

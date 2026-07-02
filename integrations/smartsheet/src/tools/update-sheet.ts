import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

export let updateSheet = SlateTool.create(spec, {
  name: 'Update Sheet',
  key: 'update_sheet',
  description: `Update a sheet's properties such as its name. Can also copy or move a sheet to a different folder or workspace.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sheetId: z.string().describe('ID of the sheet to update'),
      name: z.string().optional().describe('New name for the sheet'),
      action: z
        .enum(['rename', 'copy', 'move'])
        .optional()
        .describe('Action to perform: rename (default), copy, or move'),
      destinationType: z
        .enum(['home', 'folder', 'workspace'])
        .optional()
        .describe('Destination type for copy/move'),
      destinationId: z
        .string()
        .optional()
        .describe('Destination folder or workspace ID for copy/move'),
      newName: z.string().optional().describe('New name when copying the sheet')
    })
  )
  .output(
    z.object({
      sheetId: z.number().describe('ID of the sheet'),
      name: z.string().optional().describe('Updated sheet name'),
      permalink: z.string().optional().describe('URL to the sheet')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });
    let action = ctx.input.action || 'rename';

    if (action === 'copy') {
      let result = await client.copySheet(ctx.input.sheetId, {
        destinationType: ctx.input.destinationType || 'home',
        destinationId: ctx.input.destinationId,
        newName: ctx.input.newName || ctx.input.name || 'Copy'
      });
      let sheet = result.result || result;
      return {
        output: {
          sheetId: sheet.id,
          name: sheet.name,
          permalink: sheet.permalink
        },
        message: `Copied sheet to **${sheet.name}** (ID: ${sheet.id}).`
      };
    }

    if (action === 'move') {
      let result = await client.moveSheet(ctx.input.sheetId, {
        destinationType: ctx.input.destinationType || 'home',
        destinationId: ctx.input.destinationId
      });
      let sheet = result.result || result;
      return {
        output: {
          sheetId: sheet.id,
          name: sheet.name,
          permalink: sheet.permalink
        },
        message: `Moved sheet **${sheet.name}** (ID: ${sheet.id}).`
      };
    }

    // Rename
    let result = await client.updateSheet(ctx.input.sheetId, {
      name: ctx.input.name
    });
    let sheet = result.result || result;

    return {
      output: {
        sheetId: sheet.id || Number(ctx.input.sheetId),
        name: sheet.name || ctx.input.name,
        permalink: sheet.permalink
      },
      message: `Updated sheet **${sheet.name || ctx.input.name}**.`
    };
  })
  .build();

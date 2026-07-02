import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

export let createSheet = SlateTool.create(spec, {
  name: 'Create Sheet',
  key: 'create_sheet',
  description: `Create a new sheet with specified columns. Optionally create the sheet inside a folder or workspace. You can also create a sheet from a template by providing a template ID.`,
  instructions: [
    'At least one column must be defined with primary set to true.',
    'Column types include: TEXT_NUMBER, DATE, DATETIME, CONTACT_LIST, CHECKBOX, PICKLIST, DURATION, PREDECESSOR, ABSTRACT_DATETIME.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new sheet'),
      columns: z
        .array(
          z.object({
            title: z.string().describe('Column title'),
            type: z
              .string()
              .describe(
                'Column type (e.g., TEXT_NUMBER, DATE, CHECKBOX, PICKLIST, CONTACT_LIST)'
              ),
            primary: z
              .boolean()
              .optional()
              .describe('Set to true for the primary column (exactly one required)'),
            options: z
              .array(z.string())
              .optional()
              .describe('Options for PICKLIST or CONTACT_LIST columns'),
            width: z.number().optional().describe('Column width in pixels')
          })
        )
        .optional()
        .describe('Column definitions (required unless using templateId)'),
      folderId: z.string().optional().describe('Create the sheet in this folder'),
      workspaceId: z.string().optional().describe('Create the sheet in this workspace'),
      templateId: z
        .string()
        .optional()
        .describe('Create from a template ID instead of defining columns')
    })
  )
  .output(
    z.object({
      sheetId: z.number().describe('ID of the created sheet'),
      name: z.string().describe('Name of the created sheet'),
      accessLevel: z.string().optional().describe('Access level'),
      permalink: z.string().optional().describe('URL to the sheet')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.templateId) {
      result = await client.createSheetFromTemplate({
        name: ctx.input.name,
        fromId: Number(ctx.input.templateId)
      });
    } else if (ctx.input.folderId) {
      result = await client.createSheetInFolder(ctx.input.folderId, {
        name: ctx.input.name,
        columns: ctx.input.columns || []
      });
    } else if (ctx.input.workspaceId) {
      result = await client.createSheetInWorkspace(ctx.input.workspaceId, {
        name: ctx.input.name,
        columns: ctx.input.columns || []
      });
    } else {
      result = await client.createSheet({
        name: ctx.input.name,
        columns: ctx.input.columns || []
      });
    }

    let sheet = result.result || result;

    return {
      output: {
        sheetId: sheet.id,
        name: sheet.name,
        accessLevel: sheet.accessLevel,
        permalink: sheet.permalink
      },
      message: `Created sheet **${sheet.name}** (ID: ${sheet.id}).`
    };
  })
  .build();

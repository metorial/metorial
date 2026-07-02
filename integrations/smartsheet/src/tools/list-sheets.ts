import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

let sheetSchema = z.object({
  sheetId: z.number().describe('Unique sheet identifier'),
  name: z.string().describe('Sheet name'),
  accessLevel: z.string().optional().describe('Access level for the current user'),
  permalink: z.string().optional().describe('URL to the sheet'),
  createdAt: z.string().optional().describe('When the sheet was created'),
  modifiedAt: z.string().optional().describe('When the sheet was last modified')
});

export let listSheets = SlateTool.create(spec, {
  name: 'List Sheets',
  key: 'list_sheets',
  description: `List all sheets accessible to the current user. Returns sheet metadata including names, IDs, access levels, and timestamps. Use pagination parameters to control result size.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (1-based) for pagination'),
      pageSize: z.number().optional().describe('Number of results per page (max 500)'),
      includeAll: z
        .boolean()
        .optional()
        .describe('If true, returns all results without pagination')
    })
  )
  .output(
    z.object({
      sheets: z.array(sheetSchema).describe('List of sheets'),
      pageNumber: z.number().optional().describe('Current page number'),
      pageSize: z.number().optional().describe('Results per page'),
      totalPages: z.number().optional().describe('Total number of pages'),
      totalCount: z.number().optional().describe('Total number of sheets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });

    let result = await client.listSheets({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      includeAll: ctx.input.includeAll
    });

    let sheets = (result.data || []).map((s: any) => ({
      sheetId: s.id,
      name: s.name,
      accessLevel: s.accessLevel,
      permalink: s.permalink,
      createdAt: s.createdAt,
      modifiedAt: s.modifiedAt
    }));

    return {
      output: {
        sheets,
        pageNumber: result.pageNumber,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        totalCount: result.totalCount
      },
      message: `Found **${sheets.length}** sheets${result.totalCount ? ` (${result.totalCount} total)` : ''}.`
    };
  })
  .build();

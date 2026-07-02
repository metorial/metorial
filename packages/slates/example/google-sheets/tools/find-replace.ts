import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { spec } from '../spec';

export let findReplaceTool = SlateTool.create(spec, {
  name: 'Find and Replace',
  key: 'find_replace',
  description: `Finds and replaces text or values in a Google Sheets spreadsheet.
Supports case-sensitive matching, whole cell matching, regex patterns, and searching in formulas.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      find: z.string().describe('Text or pattern to find'),
      replacement: z.string().describe('Text to replace with'),
      matchCase: z.boolean().optional().describe('Case-sensitive search'),
      matchEntireCell: z.boolean().optional().describe('Match entire cell content only'),
      searchByRegex: z.boolean().optional().describe('Treat find string as regex pattern'),
      includeFormulas: z.boolean().optional().describe('Search within formula text'),
      sheetId: z.number().optional().describe('Limit search to specific sheet'),
      allSheets: z.boolean().optional().describe('Search all sheets (default behavior)')
    })
  )
  .output(
    z.object({
      valuesChanged: z.number().optional().describe('Number of values changed'),
      formulasChanged: z.number().optional().describe('Number of formulas changed'),
      rowsChanged: z.number().optional().describe('Number of rows affected'),
      sheetsChanged: z.number().optional().describe('Number of sheets affected'),
      occurrencesChanged: z.number().optional().describe('Total occurrences replaced')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient({ token: ctx.auth.token });

    let result = await client.findReplace(
      ctx.input.spreadsheetId,
      ctx.input.find,
      ctx.input.replacement,
      {
        matchCase: ctx.input.matchCase,
        matchEntireCell: ctx.input.matchEntireCell,
        searchByRegex: ctx.input.searchByRegex,
        includeFormulas: ctx.input.includeFormulas,
        sheetId: ctx.input.sheetId,
        allSheets: ctx.input.allSheets
      }
    );

    let output = {
      valuesChanged: result.valuesChanged,
      formulasChanged: result.formulasChanged,
      rowsChanged: result.rowsChanged,
      sheetsChanged: result.sheetsChanged,
      occurrencesChanged: result.occurrencesChanged
    };

    return {
      output,
      message: `Replaced **${output.occurrencesChanged || 0}** occurrence(s) of "${ctx.input.find}" with "${ctx.input.replacement}".`
    };
  })
  .build();

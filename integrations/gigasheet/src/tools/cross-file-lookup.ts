import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let crossFileLookup = SlateTool.create(spec, {
  name: 'Cross-File Lookup',
  key: 'cross_file_lookup',
  description: `Perform a VLOOKUP-style operation across two sheets. Joins data from a lookup sheet into the target sheet based on matching column values. Columns from the lookup sheet are added to the target sheet where matches are found.`,
  instructions: [
    'The columnName on the target sheet and lookupColumn on the lookup sheet should contain matching values to join on.',
    'returnColumns specifies which columns from the lookup sheet to bring into the target sheet.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sheetHandle: z.string().describe('Handle of the target sheet to add lookup data to'),
      columnName: z.string().describe('Column in the target sheet to match against'),
      lookupSheetHandle: z.string().describe('Handle of the sheet to look up data from'),
      lookupColumn: z.string().describe('Column in the lookup sheet to match against'),
      returnColumns: z
        .array(z.string())
        .optional()
        .describe(
          'Columns from the lookup sheet to return. If omitted, all columns may be returned.'
        )
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.unknown()).describe('Lookup operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });

    let result = await client.crossFileLookup(ctx.input.sheetHandle, ctx.input.columnName, {
      lookupSheetHandle: ctx.input.lookupSheetHandle,
      lookupColumn: ctx.input.lookupColumn,
      returnColumns: ctx.input.returnColumns
    });

    return {
      output: { result },
      message: `Cross-file lookup completed. Data from lookup sheet joined into target sheet.`
    };
  })
  .build();

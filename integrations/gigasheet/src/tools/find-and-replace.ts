import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let findAndReplace = SlateTool.create(spec, {
  name: 'Find and Replace',
  key: 'find_and_replace',
  description: `Search for values in a sheet and replace them with new values. Optionally scope the operation to a specific column and control matching behavior.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sheetHandle: z.string().describe('Handle of the sheet'),
      find: z.string().describe('The value to search for'),
      replace: z.string().describe('The value to replace matches with'),
      columnName: z.string().optional().describe('Limit the search to a specific column name'),
      caseSensitive: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether the search is case-sensitive'),
      matchWholeCell: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to match the entire cell value only')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.unknown()).describe('Find and replace operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });

    let result = await client.findAndReplace(ctx.input.sheetHandle, {
      find: ctx.input.find,
      replace: ctx.input.replace,
      column: ctx.input.columnName,
      caseSensitive: ctx.input.caseSensitive,
      matchWholeCell: ctx.input.matchWholeCell
    });

    return {
      output: { result },
      message: `Find and replace completed: replaced **"${ctx.input.find}"** with **"${ctx.input.replace}"**.`
    };
  })
  .build();

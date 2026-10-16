import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let getSheetSchema = SlateTool.create(spec, {
  name: 'Get Sheet Schema',
  key: 'get_sheet_schema',
  description:
    'Discover field IDs, types, and subtables before reading or writing a Ragic sheet. Requires account manager or administrator permissions and includes hidden field definitions.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      tabFolder: z.string().describe('The tab/folder path in the Ragic URL'),
      sheetIndex: z.number().describe('The numeric sheet index from the Ragic URL')
    })
  )
  .output(
    z.object({
      schema: z
        .record(z.string(), z.any())
        .describe('The complete sheet, field, and subtable schema returned by Ragic')
    })
  )
  .handleInvocation(async ctx => {
    let schema = await createClient(ctx.auth, ctx.config).getSheetSchema(ctx.input);
    return {
      output: { schema },
      message: `Retrieved schema for sheet **${ctx.input.tabFolder}/${ctx.input.sheetIndex}**.`
    };
  })
  .build();

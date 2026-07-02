import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

let columnSchema = z
  .object({
    columnId: z.string().optional().describe('Column identifier'),
    columnName: z.string().optional().describe('Column display name'),
    dataType: z.string().optional().describe('Data type of the column')
  })
  .passthrough();

export let getSheet = SlateTool.create(spec, {
  name: 'Get Sheet Details',
  key: 'get_sheet',
  description: `Retrieve detailed information about a Gigasheet sheet including its metadata, columns, and structure. Useful for understanding a sheet before performing data operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sheetHandle: z.string().describe('Handle (unique identifier) of the sheet'),
      includeColumns: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include column details')
    })
  )
  .output(
    z.object({
      sheet: z.record(z.string(), z.unknown()).describe('Sheet metadata and details'),
      columns: z.array(columnSchema).optional().describe('Column definitions for the sheet')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });

    let sheet = await client.describeDataset(ctx.input.sheetHandle);
    let columns: unknown[] | undefined;

    if (ctx.input.includeColumns) {
      columns = await client.getColumns(ctx.input.sheetHandle);
    }

    let sheetName = (sheet as Record<string, unknown>)?.name ?? ctx.input.sheetHandle;

    return {
      output: {
        sheet,
        columns: columns as z.infer<typeof columnSchema>[] | undefined
      },
      message: `Retrieved details for sheet **${sheetName}**${columns ? ` with **${(columns as unknown[]).length}** columns` : ''}.`
    };
  })
  .build();

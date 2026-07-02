import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single record by its ID from a Ragic sheet. Returns all field values, optionally including subtables, comments, and metadata.`,
  instructions: [
    'Provide the **tabFolder**, **sheetIndex**, and **recordId** to identify the specific record.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      tabFolder: z.string().describe('The tab/folder path in the Ragic URL (e.g., "sales")'),
      sheetIndex: z.number().describe('The numeric sheet index from the Ragic URL'),
      recordId: z.number().describe('The unique record ID to retrieve'),
      includeSubtables: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include subtable data'),
      useFieldIds: z
        .boolean()
        .optional()
        .default(false)
        .describe('Use field IDs as keys instead of field names'),
      includeInfo: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include creation date and user info'),
      includeComments: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include record comments')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('The unique record ID'),
      fields: z
        .record(z.string(), z.any())
        .describe('Record field values keyed by field name or ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverDomain: ctx.config.serverDomain,
      accountName: ctx.config.accountName
    });

    let sheet = {
      tabFolder: ctx.input.tabFolder,
      sheetIndex: ctx.input.sheetIndex
    };

    let data = await client.getRecord(sheet, ctx.input.recordId, {
      subtables: ctx.input.includeSubtables,
      naming: ctx.input.useFieldIds ? 'EID' : 'FNAME',
      info: ctx.input.includeInfo,
      comment: ctx.input.includeComments
    });

    let recordIdStr = String(ctx.input.recordId);
    let recordData = data[recordIdStr] || data;

    return {
      output: {
        recordId: recordIdStr,
        fields: recordData
      },
      message: `Retrieved record **${ctx.input.recordId}** from sheet **${ctx.input.tabFolder}/${ctx.input.sheetIndex}**.`
    };
  })
  .build();

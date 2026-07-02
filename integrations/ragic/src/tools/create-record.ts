import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Create a new record in a Ragic sheet. Provide field values as key-value pairs where keys are field IDs. Supports subtable creation, server-side formula execution, and workflow triggers.`,
  instructions: [
    'Field keys must be **field IDs** (e.g., "1000001"), not field names.',
    'For date fields use the format `yyyy/MM/dd` or `yyyy/MM/dd HH:mm:ss`.',
    'For multiple selection fields, pass an array of values.',
    'For subtables, use the key `_subtable_{subtableFieldId}` with an object mapping negative row IDs to row data.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      tabFolder: z.string().describe('The tab/folder path in the Ragic URL'),
      sheetIndex: z.number().describe('The numeric sheet index from the Ragic URL'),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Field values to set, keyed by field ID (e.g., {"1000001": "value", "_subtable_2000154": {"-1": {"2000147": "row value"}}})'
        ),
      doFormula: z
        .boolean()
        .optional()
        .default(false)
        .describe('Recalculate formulas after creation'),
      doDefaultValue: z
        .boolean()
        .optional()
        .default(false)
        .describe('Apply default values to empty fields'),
      doLinkLoad: z
        .boolean()
        .optional()
        .default(false)
        .describe('Execute link and load operations'),
      doWorkflow: z.boolean().optional().default(false).describe('Execute workflow scripts'),
      sendNotification: z.boolean().optional().describe('Send notifications to relevant users')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('The ID of the newly created record'),
      response: z.record(z.string(), z.any()).describe('Full response from the Ragic API')
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

    let result = await client.createRecord(sheet, ctx.input.fields, {
      doFormula: ctx.input.doFormula,
      doDefaultValue: ctx.input.doDefaultValue,
      doLinkLoad: ctx.input.doLinkLoad || undefined,
      doWorkflow: ctx.input.doWorkflow,
      notification: ctx.input.sendNotification
    });

    let recordId = result?.ragicId || result?._ragicId || Object.keys(result)[0] || 'unknown';

    return {
      output: {
        recordId: String(recordId),
        response: result
      },
      message: `Created new record **${recordId}** in sheet **${ctx.input.tabFolder}/${ctx.input.sheetIndex}**.`
    };
  })
  .build();

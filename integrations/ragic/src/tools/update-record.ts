import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Update an existing record in a Ragic sheet. Provide only the fields you want to modify. Supports subtable row updates, subtable row deletion, formula execution, and workflow triggers.`,
  instructions: [
    'Field keys must be **field IDs** (e.g., "1000001"), not field names.',
    'Only include fields you want to change; unspecified fields remain unchanged.',
    'To update subtable rows, use `_subtable_{subtableFieldId}` with the **existing row ID** (from a prior GET) as key.',
    'To delete subtable rows, use `_DELSUB_{subtableFieldId}` with an array of row IDs to remove.'
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
      recordId: z.number().describe('The ID of the record to update'),
      fields: z
        .record(z.string(), z.any())
        .describe('Field values to update, keyed by field ID'),
      doFormula: z
        .boolean()
        .optional()
        .default(false)
        .describe('Recalculate formulas after update'),
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
      sendNotification: z
        .boolean()
        .optional()
        .describe('Send notifications to relevant users'),
      checkLock: z
        .boolean()
        .optional()
        .default(false)
        .describe('Check if record is locked before updating; refuse if locked')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('The ID of the updated record'),
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

    let result = await client.updateRecord(sheet, ctx.input.recordId, ctx.input.fields, {
      doFormula: ctx.input.doFormula,
      doDefaultValue: ctx.input.doDefaultValue,
      doLinkLoad: ctx.input.doLinkLoad || undefined,
      doWorkflow: ctx.input.doWorkflow,
      notification: ctx.input.sendNotification,
      checkLock: ctx.input.checkLock
    });

    return {
      output: {
        recordId: String(ctx.input.recordId),
        response: result
      },
      message: `Updated record **${ctx.input.recordId}** in sheet **${ctx.input.tabFolder}/${ctx.input.sheetIndex}**.`
    };
  })
  .build();

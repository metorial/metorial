import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Update one or more records in any Zoho CRM module.
For a single record, provide **recordId** and **recordData**. For bulk updates, provide **records** with each item containing an "id" field.
Optionally control which workflow triggers fire upon update.`,
  instructions: [
    'For a single record: set recordId and recordData.',
    'For bulk updates: set records as an array of objects each with an "id" field plus fields to update.',
    'Lookup fields should be set with an object containing an "id" key.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      module: z.string().describe('API name of the CRM module'),
      recordId: z
        .string()
        .optional()
        .describe('ID of the single record to update (use with recordData)'),
      recordData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Fields to update on the single record'),
      records: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of record objects each with an "id" field for bulk updates'),
      triggers: z
        .array(z.enum(['approval', 'workflow', 'blueprint']))
        .optional()
        .describe('Workflow triggers to fire on update')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            recordId: z.string().optional().describe('ID of the updated record'),
            status: z.string().describe('Status of the operation'),
            message: z.string().optional().describe('Status message'),
            code: z.string().optional().describe('Response code')
          })
        )
        .describe('Results for each record update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    let result: any;

    if (ctx.input.recordId && ctx.input.recordData) {
      result = await client.updateRecord(
        ctx.input.module,
        ctx.input.recordId,
        ctx.input.recordData,
        ctx.input.triggers
      );
    } else if (ctx.input.records?.length) {
      result = await client.updateRecords(
        ctx.input.module,
        ctx.input.records as Array<{ id: string } & Record<string, any>>,
        ctx.input.triggers
      );
    } else {
      return {
        output: { results: [] },
        message: 'No records to update. Provide either recordId+recordData or records array.'
      };
    }

    let results = (result?.data || []).map((item: any) => ({
      recordId: item?.details?.id,
      status: item?.status || 'error',
      message: item?.message,
      code: item?.code
    }));

    let successCount = results.filter((r: any) => r.status === 'success').length;

    return {
      output: { results },
      message: `Updated **${successCount}** record(s) in **${ctx.input.module}**.`
    };
  })
  .build();

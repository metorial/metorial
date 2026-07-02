import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Create one or more records in any Zoho CRM module.
Provide the module name and an array of record objects with field values.
Optionally control which workflow triggers fire upon creation.`,
  instructions: [
    'Use the module\'s field API names as keys in the record data (e.g. "Last_Name", "Email", "Company").',
    'Use the Get Module Fields tool to discover valid field names for a module.',
    'Lookup fields should be set with an object containing an "id" key, e.g. { "Account_Name": { "id": "123456" } }.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      module: z
        .string()
        .describe('API name of the CRM module, e.g. "Leads", "Contacts", "Deals"'),
      records: z
        .array(z.record(z.string(), z.any()))
        .min(1)
        .describe('Array of record objects with field API names as keys'),
      triggers: z
        .array(z.enum(['approval', 'workflow', 'blueprint']))
        .optional()
        .describe('Workflow triggers to fire on creation')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            recordId: z.string().optional().describe('ID of the created record'),
            status: z.string().describe('Status of the operation (success or error)'),
            message: z.string().optional().describe('Status message'),
            code: z.string().optional().describe('Response code')
          })
        )
        .describe('Results for each record creation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    let result = await client.createRecords(
      ctx.input.module,
      ctx.input.records,
      ctx.input.triggers
    );

    let results = (result?.data || []).map((item: any) => ({
      recordId: item?.details?.id,
      status: item?.status || 'error',
      message: item?.message,
      code: item?.code
    }));

    let successCount = results.filter((r: any) => r.status === 'success').length;

    return {
      output: { results },
      message: `Created **${successCount}** of **${ctx.input.records.length}** record(s) in **${ctx.input.module}**.`
    };
  })
  .build();

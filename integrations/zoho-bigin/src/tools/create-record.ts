import { SlateTool } from 'slates';
import { z } from 'zod';
import { BiginClient } from '../lib/client';
import { spec } from '../spec';

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Create one or more records in any Bigin module. Use field API names for the record data (e.g., Last_Name, Email, Phone for Contacts; Pipeline_Name, Amount for Pipelines). Retrieve field API names using the **Get Module Fields** tool if unsure.`,
  instructions: [
    'Use field API names (not display labels) for all field values.',
    'For lookup fields (e.g., Owner, Account_Name), pass an object with an "id" property.',
    'A maximum of 100 records can be created per call.'
  ]
})
  .input(
    z.object({
      module: z
        .enum(['Contacts', 'Accounts', 'Pipelines', 'Products', 'Tasks', 'Events', 'Calls'])
        .describe(
          'Module API name to create records in. Accounts = Companies, Pipelines = Deals.'
        ),
      records: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of record objects with field API names as keys')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            recordId: z.string().optional().describe('ID of the created record'),
            status: z.string().describe('Operation status'),
            message: z.string().optional().describe('Status message'),
            code: z.string().optional().describe('Status code')
          })
        )
        .describe('Results for each record creation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.createRecords(ctx.input.module, ctx.input.records);
    let data = result.data || [];

    let results = data.map((item: any) => ({
      recordId: item.details?.id,
      status: item.status,
      message: item.message,
      code: item.code
    }));

    let successCount = results.filter((r: any) => r.status === 'success').length;

    return {
      output: { results },
      message: `Created **${successCount}** of **${ctx.input.records.length}** record(s) in **${ctx.input.module}**.`
    };
  })
  .build();

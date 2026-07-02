import { SlateTool } from 'slates';
import { z } from 'zod';
import { BiginClient } from '../lib/client';
import { spec } from '../spec';

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Update one or more existing records in any Bigin module. Provide the record ID and the fields to update. Only the specified fields will be modified; other fields remain unchanged.`,
  instructions: [
    'Each record in the array must include an "id" field.',
    'Use field API names for all field values.',
    'A maximum of 100 records can be updated per call.'
  ]
})
  .input(
    z.object({
      module: z
        .enum(['Contacts', 'Accounts', 'Pipelines', 'Products', 'Tasks', 'Events', 'Calls'])
        .describe('Module API name. Accounts = Companies, Pipelines = Deals.'),
      records: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of record objects, each must include "id" and the fields to update')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            recordId: z.string().optional().describe('ID of the updated record'),
            status: z.string().describe('Operation status'),
            message: z.string().optional().describe('Status message'),
            code: z.string().optional().describe('Status code')
          })
        )
        .describe('Results for each record update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.updateRecords(ctx.input.module, ctx.input.records);
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
      message: `Updated **${successCount}** of **${ctx.input.records.length}** record(s) in **${ctx.input.module}**.`
    };
  })
  .build();

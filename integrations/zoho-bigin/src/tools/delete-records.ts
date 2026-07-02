import { SlateTool } from 'slates';
import { z } from 'zod';
import { BiginClient } from '../lib/client';
import { spec } from '../spec';

export let deleteRecords = SlateTool.create(spec, {
  name: 'Delete Records',
  key: 'delete_records',
  description: `Permanently delete one or more records from any Bigin module by their IDs.`,
  constraints: ['A maximum of 100 records can be deleted per call.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      module: z
        .enum(['Contacts', 'Accounts', 'Pipelines', 'Products', 'Tasks', 'Events', 'Calls'])
        .describe('Module API name. Accounts = Companies, Pipelines = Deals.'),
      recordIds: z.array(z.string()).describe('Array of record IDs to delete (max 100)')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            recordId: z.string().optional().describe('ID of the deleted record'),
            status: z.string().describe('Operation status'),
            message: z.string().optional().describe('Status message'),
            code: z.string().optional().describe('Status code')
          })
        )
        .describe('Results for each record deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.deleteRecords(ctx.input.module, ctx.input.recordIds);
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
      message: `Deleted **${successCount}** of **${ctx.input.recordIds.length}** record(s) from **${ctx.input.module}**.`
    };
  })
  .build();

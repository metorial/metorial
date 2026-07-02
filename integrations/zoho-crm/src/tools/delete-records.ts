import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { zohoCrmServiceError } from '../lib/errors';
import { spec } from '../spec';

export let deleteRecords = SlateTool.create(spec, {
  name: 'Delete Records',
  key: 'delete_records',
  description: `Delete one or more records from any Zoho CRM module by their IDs.
Permanently removes the specified records. This action cannot be undone.`,
  constraints: [
    'Maximum 100 record IDs per request.',
    'Deleted records cannot be recovered via the API.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      module: z.string().describe('API name of the CRM module'),
      recordIds: z.array(z.string()).min(1).describe('IDs of the records to delete'),
      workflowTrigger: z
        .boolean()
        .optional()
        .describe('Whether Zoho CRM workflow rules should run on deletion. Default: true.')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            recordId: z.string().optional().describe('ID of the deleted record'),
            status: z.string().describe('Status of the operation'),
            message: z.string().optional().describe('Status message'),
            code: z.string().optional().describe('Response code')
          })
        )
        .describe('Results for each record deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    if (ctx.input.recordIds.length > 100) {
      throw zohoCrmServiceError('Zoho CRM can delete at most 100 records per request.');
    }

    let result = await client.deleteRecords(ctx.input.module, ctx.input.recordIds, {
      workflowTrigger: ctx.input.workflowTrigger
    });

    let results = (result?.data || []).map((item: any) => ({
      recordId: item?.details?.id,
      status: item?.status || 'error',
      message: item?.message,
      code: item?.code
    }));

    let successCount = results.filter((r: any) => r.status === 'success').length;

    return {
      output: { results },
      message: `Deleted **${successCount}** of **${ctx.input.recordIds.length}** record(s) from **${ctx.input.module}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRelatedRecords = SlateTool.create(spec, {
  name: 'Get Related Records',
  key: 'get_related_records',
  description: `Retrieve records related to a specific CRM record through lookup or multi-select lookup fields.
For example, get all Contacts related to an Account, or all Tasks associated with a Deal.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z.string().describe('API name of the parent module (e.g. "Accounts")'),
      recordId: z.string().describe('ID of the parent record'),
      relatedModule: z
        .string()
        .describe('API name of the related module (e.g. "Contacts", "Tasks", "Notes")'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Records per page (max 200)')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.any())).describe('Related records'),
      moreRecords: z
        .boolean()
        .optional()
        .describe('Whether more related records are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    let result = await client.getRelatedRecords(
      ctx.input.module,
      ctx.input.recordId,
      ctx.input.relatedModule,
      ctx.input.page,
      ctx.input.perPage
    );

    let records = result?.data || [];
    let moreRecords = result?.info?.more_records || false;

    return {
      output: { records, moreRecords },
      message: `Retrieved **${records.length}** related **${ctx.input.relatedModule}** record(s) for **${ctx.input.module}/${ctx.input.recordId}**.`
    };
  })
  .build();

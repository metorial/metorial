import { SlateTool } from 'slates';
import { z } from 'zod';
import { BiginClient } from '../lib/client';
import { spec } from '../spec';

export let getRecords = SlateTool.create(spec, {
  name: 'Get Records',
  key: 'get_records',
  description: `Retrieve records from any Bigin module. Supports filtering by custom view, field selection, sorting, and pagination. Use this to list contacts, companies, pipelines (deals), products, tasks, events, or calls.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z
        .enum(['Contacts', 'Accounts', 'Pipelines', 'Products', 'Tasks', 'Events', 'Calls'])
        .describe(
          'Module API name to retrieve records from. Accounts = Companies, Pipelines = Deals.'
        ),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated field API names to include (max 50). Omit to return default fields.'
        ),
      sortBy: z.string().optional().describe('Field API name to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number (default 1)'),
      perPage: z.number().optional().describe('Records per page (default 200, max 200)'),
      customViewId: z.string().optional().describe('Custom view ID to filter records'),
      pageToken: z.string().optional().describe('Page token for fetching records beyond 2000')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.any())).describe('Array of record objects'),
      moreRecords: z.boolean().optional().describe('Whether more records are available'),
      nextPageToken: z.string().optional().describe('Token for fetching next page of records'),
      count: z.number().optional().describe('Number of records returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.getRecords(ctx.input.module, {
      fields: ctx.input.fields,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      cvid: ctx.input.customViewId,
      pageToken: ctx.input.pageToken
    });

    let records = result.data || [];
    let info = result.info || {};

    return {
      output: {
        records,
        moreRecords: info.more_records,
        nextPageToken: info.next_page_token,
        count: info.count
      },
      message: `Retrieved **${records.length}** record(s) from **${ctx.input.module}**.${info.more_records ? ' More records available.' : ''}`
    };
  })
  .build();

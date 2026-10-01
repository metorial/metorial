import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { BiginClient } from '../lib/client';

export let getRecords = SlateTool.create(spec, {
  name: 'Bigin Get Records',
  key: 'bigin_get_records',
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
          'Comma-separated field API names to include (max 50). Omit to discover and return up to 50 available fields.'
        ),
      sortBy: z.string().optional().describe('Field API name to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().int().min(1).optional().describe('Page number (default 1)'),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Records per page (default 200, max 200)'),
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

    if (ctx.input.page !== undefined && ctx.input.pageToken) {
      throw createApiServiceError('Use either page or pageToken, not both.');
    }
    let fields = ctx.input.fields;
    if (!fields?.trim()) {
      let metadata = await client.getFields(ctx.input.module);
      fields = (metadata?.fields ?? [])
        .map((field: any) => field.api_name)
        .filter(Boolean)
        .slice(0, 50)
        .join(',');
    }
    if (!fields?.trim())
      throw createApiServiceError(
        'No available fields were found. Provide field API names using fields.'
      );
    if (fields.split(',').length > 50)
      throw createApiServiceError('Specify at most 50 fields.');

    let result = await client.getRecords(ctx.input.module, {
      fields,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      cvid: ctx.input.customViewId,
      pageToken: ctx.input.pageToken
    });

    let records = result?.data || [];
    let info = result?.info || {};

    return {
      output: {
        records,
        moreRecords: info.more_records,
        nextPageToken: info.next_page_token ?? undefined,
        count: info.count
      },
      message: `Retrieved **${records.length}** record(s) from **${ctx.input.module}**.${info.more_records ? ' More records available.' : ''}`
    };
  })
  .build();

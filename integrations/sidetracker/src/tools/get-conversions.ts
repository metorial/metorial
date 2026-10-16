import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getConversions = SlateTool.create(spec, {
  name: 'Get Conversions',
  key: 'get_conversions',
  description:
    'Retrieve converted visitor sessions across tracked domains, with contact, revenue, and advertising attribution data. Filter by status, tags, date range, or changes since a timestamp.',
  instructions: [
    'Supplying domainId limits the request to one tracked domain and improves performance.',
    'The provider ignores malformed filters, potentially returning a broader result set.',
    'Use updatedSince for incremental syncs and order=id to page through the whole list.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      domainId: z.string().optional().describe('Optional tracked domain ID to limit results'),
      page: z.number().int().optional().describe('Page number'),
      pageSize: z
        .number()
        .int()
        .optional()
        .describe('Items per page; capped by the provider at 500, or 100 with attribution'),
      search: z
        .string()
        .optional()
        .describe(
          'Search names, session IDs, or campaign data; supports meta:<key>, data:<key>, and status:<STATUS>'
        ),
      salesStatuses: z
        .array(z.string())
        .optional()
        .describe('Stored sales status names, combined with OR; unknown statuses are ignored'),
      tags: z.array(z.string()).optional().describe('Tag names to filter by'),
      labels: z.array(z.string()).optional().describe('Referrer label names to filter by'),
      dateRange: z
        .string()
        .optional()
        .describe('Conversion date range, formatted as YYYY-MM-DD to YYYY-MM-DD'),
      updatedSince: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp; return sessions changed at or after this moment'),
      converted: z
        .enum(['yes', 'no'])
        .optional()
        .describe('Whether the session has recorded revenue'),
      includeHidden: z.boolean().optional().describe('Include sessions marked as SPAM'),
      tab: z
        .enum(['all', 'inbox', 'archived'])
        .optional()
        .describe('All sessions, unarchived sessions, or archived sessions'),
      order: z
        .enum(['converted_at', 'id'])
        .optional()
        .describe('Sort by conversion date or ID'),
      includeAttribution: z
        .boolean()
        .optional()
        .describe('Set false to omit attribution and allow larger pages'),
      lookback: z
        .enum(['30', '60', '90', 'all'])
        .optional()
        .describe('Attribution window in days, or all history'),
      model: z
        .enum(['last_click', 'first_click', 'linear', 'position_based', 'time_decay'])
        .optional()
        .describe('Attribution model')
    })
  )
  .output(
    z.object({
      result: z.unknown().describe('Unmodified conversion response from Sidetracker')
    })
  )
  .handleInvocation(async ctx => {
    let params = new URLSearchParams();
    let input = ctx.input;
    let values = {
      domain_id: input.domainId,
      page: input.page,
      page_size: input.pageSize,
      search: input.search,
      daterange: input.dateRange,
      updated_since: input.updatedSince,
      converted: input.converted,
      tab: input.tab,
      order: input.order,
      lookback: input.lookback,
      model: input.model
    };
    for (let [key, value] of Object.entries(values)) {
      if (value !== undefined) params.set(key, String(value));
    }
    if (input.includeHidden !== undefined)
      params.set('include_hidden', input.includeHidden ? '1' : '0');
    if (input.includeAttribution !== undefined)
      params.set('attribution', input.includeAttribution ? '1' : '0');
    for (let value of input.salesStatuses ?? []) params.append('sales_status', value);
    for (let value of input.tags ?? []) params.append('tag', value);
    for (let value of input.labels ?? []) params.append('label', value);
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getConversions(params);
    return { output: { result }, message: 'Retrieved converted visitor sessions.' };
  })
  .build();

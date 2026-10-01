import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { BiginClient } from '../lib/client';

export let searchRecords = SlateTool.create(spec, {
  name: 'Bigin Search Records',
  key: 'bigin_search_records',
  description: `Search for records within a Bigin module using criteria-based queries, email addresses, phone numbers, or keywords. Provide exactly one search method per request.`,
  instructions: [
    'Criteria format: `(Field_API_Name:comparator:value)`. Example: `(Last_Name:equals:Smith)`.',
    'Supported comparators: `equals`, `starts_with`, `greater_than`, `less_than`, `not_equal`, `greater_equal`, `less_equal`, `between`, and `in` (depending on the field type).',
    'Combine criteria with `and`/`or`: `((Last_Name:equals:Smith)and(Email:starts_with:john))`.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z
        .enum(['Contacts', 'Accounts', 'Pipelines', 'Products', 'Tasks', 'Events', 'Calls'])
        .describe('Module API name to search in. Accounts = Companies, Pipelines = Deals.'),
      criteria: z
        .string()
        .optional()
        .describe('Search criteria in Bigin format, e.g. (Last_Name:equals:Smith)'),
      email: z.string().optional().describe('Search by email address across all email fields'),
      phone: z.string().optional().describe('Search by phone number across all phone fields'),
      word: z.string().optional().describe('Keyword search across all searchable fields'),
      page: z.number().int().min(1).optional().describe('Page number (default 1)'),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Records per page (default 200, max 200)')
    })
  )
  .output(
    z.object({
      records: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of matching record objects'),
      moreRecords: z.boolean().optional().describe('Whether more results are available'),
      count: z.number().optional().describe('Number of records returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let modes = [ctx.input.criteria, ctx.input.email, ctx.input.phone, ctx.input.word].filter(
      value => value?.trim()
    );
    if (modes.length !== 1)
      throw createApiServiceError(
        'Provide exactly one search method: criteria, email, phone, or word.'
      );
    let result = await client.searchRecords(ctx.input.module, {
      criteria: ctx.input.criteria,
      email: ctx.input.email,
      phone: ctx.input.phone,
      word: ctx.input.word,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let records = result?.data || [];
    let info = result?.info || {};

    return {
      output: {
        records,
        moreRecords: info.more_records,
        count: info.count
      },
      message: `Found **${records.length}** record(s) in **${ctx.input.module}**.${info.more_records ? ' More results available.' : ''}`
    };
  })
  .build();

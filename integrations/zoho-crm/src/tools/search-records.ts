import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchRecords = SlateTool.create(spec, {
  name: 'Search Records',
  key: 'search_records',
  description: `Search for records in any Zoho CRM module using criteria, email, phone, or keyword.
Supports the Zoho CRM search criteria syntax for advanced filtering.
Use **criteria** for field-based filters, **email**/**phone** for contact lookups, or **word** for full-text search.`,
  instructions: [
    'Criteria syntax: "(Field_API_Name:operator:value)" — e.g. "(Last_Name:equals:Smith)".',
    'Combine criteria with "and"/"or" — e.g. "((Last_Name:equals:Smith)and(Company:equals:Acme))".',
    'Supported operators: equals, starts_with, contains, greater_than, less_than, between, in, not_equal.',
    'Only one of criteria, email, phone, or word should be provided per request.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z.string().describe('API name of the CRM module to search'),
      criteria: z
        .string()
        .optional()
        .describe('Search criteria using Zoho CRM criteria syntax'),
      email: z.string().optional().describe('Search by email address'),
      phone: z.string().optional().describe('Search by phone number'),
      word: z.string().optional().describe('Full-text keyword search'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      perPage: z.number().optional().describe('Results per page (max 200)')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.any())).describe('Matching records'),
      moreRecords: z.boolean().optional().describe('Whether more records are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    let result = await client.searchRecords(ctx.input.module, {
      criteria: ctx.input.criteria,
      email: ctx.input.email,
      phone: ctx.input.phone,
      word: ctx.input.word,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let records = result?.data || [];
    let moreRecords = result?.info?.more_records || false;

    return {
      output: { records, moreRecords },
      message: `Found **${records.length}** record(s) in **${ctx.input.module}**.${moreRecords ? ' More results available.' : ''}`
    };
  })
  .build();

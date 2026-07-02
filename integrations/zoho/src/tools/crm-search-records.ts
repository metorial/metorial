import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoCrmClient } from '../lib/client';
import { zohoServiceError } from '../lib/errors';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

export let crmSearchRecords = SlateTool.create(spec, {
  name: 'CRM Search Records',
  key: 'crm_search_records',
  description: `Search for records in a Zoho CRM module using criteria, email, phone, or keyword. Also supports executing COQL (CRM Object Query Language) queries for more complex data retrieval similar to SQL SELECT statements.`,
  instructions: [
    'For basic search, provide one of: criteria, email, phone, or word.',
    'Criteria format: `((field_api_name:operator:value))` — operators include equals, not_equal, starts_with, contains, greater_than, less_than, between, in.',
    'Multiple criteria can be combined with `and`/`or`: `((Last_Name:equals:Smith)and(Company:equals:Acme))`.',
    "For COQL queries, provide a coqlQuery string like `select Last_Name, Email from Leads where Company = 'Acme' limit 10`.",
    'Search results are indexed asynchronously — newly created records may not appear immediately. Use COQL for real-time results.'
  ],
  constraints: [
    'Search returns a maximum of 2000 records.',
    'Only one search parameter (criteria, email, phone, word) is used at a time, with priority: criteria > email > phone > word.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z
        .string()
        .optional()
        .describe('CRM module API name (required for search, not needed for COQL)'),
      criteria: z
        .string()
        .optional()
        .describe('Search criteria expression, e.g., ((Last_Name:equals:Smith))'),
      email: z.string().optional().describe('Search by email address across all email fields'),
      phone: z.string().optional().describe('Search by phone number across all phone fields'),
      word: z.string().optional().describe('Keyword search across all text fields'),
      coqlQuery: z
        .string()
        .optional()
        .describe(
          'COQL query string (e.g., "select Last_Name, Email from Leads where Company = \'Acme\'")'
        ),
      fields: z.string().optional().describe('Comma-separated field API names to return'),
      converted: z
        .enum(['true', 'false', 'both'])
        .optional()
        .describe('Converted-record filter'),
      approved: z.enum(['true', 'false', 'both']).optional().describe('Approval-state filter'),
      userType: z
        .string()
        .optional()
        .describe('Users module type filter, such as "ActiveUsers" or "CurrentUser"'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Records per page (max 200)')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.any())).describe('Matching records'),
      count: z.number().optional().describe('Number of records returned'),
      moreRecords: z.boolean().optional().describe('Whether more records are available')
    })
  )
  .handleInvocation(async ctx => {
    let dc = (ctx.auth.datacenter || ctx.config.datacenter || 'us') as Datacenter;
    let client = new ZohoCrmClient({ token: ctx.auth.token, datacenter: dc });

    if (ctx.input.coqlQuery) {
      let result = await client.executeCoql(ctx.input.coqlQuery);
      let records = result?.data || [];
      return {
        output: {
          records,
          count: result?.info?.count ?? records.length,
          moreRecords: result?.info?.more_records ?? false
        },
        message: `COQL query returned **${records.length}** records.`
      };
    }

    if (!ctx.input.module) throw zohoServiceError('module is required when not using COQL');

    let result = await client.searchRecords(ctx.input.module, {
      criteria: ctx.input.criteria,
      email: ctx.input.email,
      phone: ctx.input.phone,
      word: ctx.input.word,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      fields: ctx.input.fields,
      converted: ctx.input.converted,
      approved: ctx.input.approved,
      userType: ctx.input.userType
    });

    let records = result?.data || [];
    return {
      output: {
        records,
        count: result?.info?.count ?? records.length,
        moreRecords: result?.info?.more_records ?? false
      },
      message: `Search in **${ctx.input.module}** returned **${records.length}** records.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRecords = SlateTool.create(spec, {
  name: 'Get Records',
  key: 'get_records',
  description: `Retrieve records from any Zoho CRM module (Leads, Contacts, Accounts, Deals, Tasks, Events, etc.).
Supports pagination, field selection, sorting, and fetching specific records by ID.
Use **module** to specify which CRM module to query, and optionally filter or sort results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z
        .string()
        .describe(
          'API name of the CRM module, e.g. "Leads", "Contacts", "Accounts", "Deals", "Tasks", "Events", "Campaigns", "Products"'
        ),
      recordIds: z.array(z.string()).optional().describe('Specific record IDs to retrieve'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Specific field API names to include in the response'),
      sortBy: z.string().optional().describe('Field API name to sort results by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of records per page (max 200)')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.any())).describe('Array of CRM records'),
      moreRecords: z
        .boolean()
        .optional()
        .describe('Whether more records are available for pagination')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    let result = await client.getRecords(ctx.input.module, {
      ids: ctx.input.recordIds,
      fields: ctx.input.fields,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let records = result?.data || [];
    let moreRecords = result?.info?.more_records || false;

    return {
      output: { records, moreRecords },
      message: `Retrieved **${records.length}** record(s) from **${ctx.input.module}**.${moreRecords ? ' More records are available.' : ''}`
    };
  })
  .build();

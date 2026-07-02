import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoCrmClient } from '../lib/client';
import { zohoServiceError } from '../lib/errors';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

export let crmGetRecords = SlateTool.create(spec, {
  name: 'CRM Get Records',
  key: 'crm_get_records',
  description: `Retrieve records from any Zoho CRM module (Leads, Contacts, Accounts, Deals, Tasks, etc.). Supports pagination, field selection, sorting, and filtering by custom view ID. Can also fetch a single record by ID.`,
  instructions: [
    'Specify the module API name (e.g., "Leads", "Contacts", "Accounts", "Deals").',
    'To fetch a single record, provide the recordId. To list records, omit recordId.',
    'Use the fields parameter to limit which fields are returned (comma-separated API field names, max 50).'
  ],
  constraints: [
    'Maximum 200 records per page.',
    'Maximum 2000 records accessible via page-based pagination.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z
        .string()
        .describe(
          'CRM module API name (e.g., "Leads", "Contacts", "Accounts", "Deals", "Tasks")'
        ),
      recordId: z
        .string()
        .optional()
        .describe('Specific record ID to fetch. If provided, returns a single record.'),
      fields: z
        .string()
        .optional()
        .describe('Comma-separated field API names to return (max 50)'),
      ids: z
        .string()
        .optional()
        .describe('Comma-separated record IDs to fetch from the module'),
      page: z.number().optional().describe('Page number for pagination (default 1)'),
      perPage: z.number().optional().describe('Number of records per page (max 200)'),
      pageToken: z
        .string()
        .optional()
        .describe('Page token for retrieving records after 2000'),
      sortBy: z
        .string()
        .optional()
        .describe('Field to sort by (e.g., "Created_Time", "Modified_Time")'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      customViewId: z.string().optional().describe('Custom view ID to filter records'),
      converted: z
        .enum(['true', 'false', 'both'])
        .optional()
        .describe('Converted-record filter for supported modules'),
      territoryId: z.string().optional().describe('Territory ID filter for supported modules'),
      includeChild: z
        .boolean()
        .optional()
        .describe('Include child territory records when territoryId is provided')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.any())).describe('Array of CRM records'),
      moreRecords: z.boolean().optional().describe('Whether more records are available'),
      count: z.number().optional().describe('Number of records returned'),
      nextPageToken: z.string().nullable().optional().describe('Token for the next page'),
      previousPageToken: z
        .string()
        .nullable()
        .optional()
        .describe('Token for the previous page'),
      pageTokenExpiry: z.string().nullable().optional().describe('Page token expiry timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let dc = (ctx.auth.datacenter || ctx.config.datacenter || 'us') as Datacenter;
    let client = new ZohoCrmClient({ token: ctx.auth.token, datacenter: dc });

    if (ctx.input.recordId) {
      let result = await client.getRecord(
        ctx.input.module,
        ctx.input.recordId,
        ctx.input.fields
      );
      let records = result?.data || [];
      return {
        output: { records, moreRecords: false, count: records.length },
        message: `Fetched record **${ctx.input.recordId}** from **${ctx.input.module}**.`
      };
    }

    if (!ctx.input.fields) {
      throw zohoServiceError('fields is required when listing CRM records.');
    }
    if (ctx.input.pageToken && ctx.input.page) {
      throw zohoServiceError('pageToken cannot be used with page.');
    }
    if (ctx.input.customViewId && ctx.input.sortBy) {
      throw zohoServiceError('customViewId cannot be used with sortBy.');
    }

    let result = await client.getRecords(ctx.input.module, {
      fields: ctx.input.fields,
      ids: ctx.input.ids,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      pageToken: ctx.input.pageToken,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      cvid: ctx.input.customViewId,
      converted: ctx.input.converted,
      territoryId: ctx.input.territoryId,
      includeChild: ctx.input.includeChild
    });

    let records = result?.data || [];
    let info = result?.info;

    return {
      output: {
        records,
        moreRecords: info?.more_records ?? false,
        count: info?.count ?? records.length,
        nextPageToken: info?.next_page_token,
        previousPageToken: info?.previous_page_token,
        pageTokenExpiry: info?.page_token_expiry
      },
      message: `Retrieved **${records.length}** records from **${ctx.input.module}**${info?.more_records ? ' (more available)' : ''}.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { zohoCrmServiceError } from '../lib/errors';
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
        .describe(
          'Field API names to include in the response. Required by Zoho CRM V8 for list-style record fetches.'
        ),
      customViewId: z
        .string()
        .optional()
        .describe('Custom view ID to filter records. Cannot be combined with sortBy.'),
      sortBy: z.string().optional().describe('Field API name to sort results by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of records per page (max 200)'),
      pageToken: z
        .string()
        .optional()
        .describe(
          'Zoho next_page_token for fetching beyond the first 2,000 records. Cannot be combined with page.'
        ),
      converted: z
        .enum(['true', 'false', 'both'])
        .optional()
        .describe('Lead conversion filter for modules that support converted records.'),
      territoryId: z.string().optional().describe('Territory ID to filter records.'),
      includeChildTerritories: z
        .boolean()
        .optional()
        .describe('Include child territory records when territoryId is provided.')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.any())).describe('Array of CRM records'),
      moreRecords: z
        .boolean()
        .optional()
        .describe('Whether more records are available for pagination'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token to use in pageToken for the next page when Zoho returns one.'),
      previousPageToken: z.string().optional().describe('Previous page token, when returned.'),
      count: z.number().optional().describe('Number of records returned in this page.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    if (!ctx.input.fields?.length) {
      throw zohoCrmServiceError('fields is required when listing Zoho CRM records in V8.');
    }
    if (ctx.input.page && ctx.input.pageToken) {
      throw zohoCrmServiceError('Use either page or pageToken, not both.');
    }
    if (ctx.input.customViewId && ctx.input.sortBy) {
      throw zohoCrmServiceError('Use either customViewId or sortBy, not both.');
    }

    let result = await client.getRecords(ctx.input.module, {
      ids: ctx.input.recordIds,
      fields: ctx.input.fields,
      customViewId: ctx.input.customViewId,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      pageToken: ctx.input.pageToken,
      converted: ctx.input.converted,
      territoryId: ctx.input.territoryId,
      includeChildTerritories: ctx.input.includeChildTerritories
    });

    let records = result?.data || [];
    let moreRecords = result?.info?.more_records || false;

    return {
      output: {
        records,
        moreRecords,
        nextPageToken: result?.info?.next_page_token ?? undefined,
        previousPageToken: result?.info?.previous_page_token ?? undefined,
        count: result?.info?.count
      },
      message: `Retrieved **${records.length}** record(s) from **${ctx.input.module}**.${moreRecords ? ' More records are available.' : ''}`
    };
  })
  .build();

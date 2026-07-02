import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoCrmClient } from '../lib/client';
import { zohoServiceError } from '../lib/errors';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

export let crmGetRelatedRecords = SlateTool.create(spec, {
  name: 'CRM Get Related Records',
  key: 'crm_get_related_records',
  description:
    'Retrieve related records for a Zoho CRM record, such as Notes, Attachments, Emails, Deals, Contacts, or custom related lists. Supports field selection, pagination, sorting, and ID filtering.',
  instructions: [
    'Provide the parent module API name, parent record ID, and related list API name.',
    'Use relatedListApiName values from CRM related list metadata, such as "Notes", "Attachments", or a custom related list API name.',
    'The fields parameter is required by Zoho CRM for related-record list retrieval.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z.string().describe('Parent CRM module API name, e.g. "Leads" or "Contacts"'),
      recordId: z.string().describe('Parent CRM record ID'),
      relatedListApiName: z.string().describe('Related list API name, e.g. "Notes"'),
      fields: z
        .string()
        .describe('Comma-separated field API names to return from the related records'),
      ids: z.string().optional().describe('Comma-separated related record IDs to fetch'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Records per page, max 200'),
      pageToken: z
        .string()
        .optional()
        .describe('Page token for retrieving records after 2000'),
      sortBy: z
        .string()
        .optional()
        .describe('Sort field, typically id, Created_Time, or Modified_Time'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      converted: z
        .enum(['true', 'false', 'both'])
        .optional()
        .describe('Converted-record filter for supported modules')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.any())).describe('Related CRM records'),
      moreRecords: z
        .boolean()
        .optional()
        .describe('Whether more related records are available'),
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

    if (ctx.input.pageToken && ctx.input.page) {
      throw zohoServiceError('pageToken cannot be used with page.');
    }

    let result = await client.getRelatedRecords(
      ctx.input.module,
      ctx.input.recordId,
      ctx.input.relatedListApiName,
      {
        fields: ctx.input.fields,
        ids: ctx.input.ids,
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        pageToken: ctx.input.pageToken,
        sortBy: ctx.input.sortBy,
        sortOrder: ctx.input.sortOrder,
        converted: ctx.input.converted
      }
    );

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
      message: `Retrieved **${records.length}** related records from **${ctx.input.relatedListApiName}**.`
    };
  })
  .build();

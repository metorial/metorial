import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let filterConditionSchema = z
  .object({
    fieldId: z.string().describe('The field ID to filter on (e.g., "1000001")'),
    operator: z
      .enum(['eq', 'regex', 'like', 'gte', 'lte', 'gt', 'lt'])
      .describe(
        'Filter operator: eq (equals), regex (regular expression), like (contains), gte/lte/gt/lt (comparison)'
      ),
    value: z
      .string()
      .describe(
        'The value to filter against. Leave empty to match empty fields. Use yyyy/MM/dd format for dates.'
      )
  })
  .describe('A single filter condition');

export let listRecords = SlateTool.create(spec, {
  name: 'List Records',
  key: 'list_records',
  description: `Query and retrieve records from a Ragic sheet with optional filtering, search, sorting, and pagination. Returns record data as key-value pairs keyed by record ID.`,
  instructions: [
    'The **tabFolder** and **sheetIndex** identify the sheet. Find these from your Ragic sheet URL: https://{server}/{account}/{tabFolder}/{sheetIndex}',
    'Multiple filter conditions on different fields use AND logic. Multiple eq/like/regex on the same field use OR logic.',
    'Default limit is 1000 records. Use **limit** and **offset** for pagination.'
  ],
  constraints: ['Maximum 1000 records returned per request by default'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      tabFolder: z
        .string()
        .describe('The tab/folder path in the Ragic URL (e.g., "sales", "hr/employees")'),
      sheetIndex: z.number().describe('The numeric sheet index from the Ragic URL'),
      filters: z
        .array(filterConditionSchema)
        .optional()
        .describe('Filter conditions to apply when querying records'),
      fullTextSearch: z
        .string()
        .optional()
        .describe('Full-text search query to filter records'),
      sortFieldId: z.string().optional().describe('Field ID to sort results by'),
      sortDirection: z
        .enum(['ASC', 'DESC'])
        .optional()
        .default('ASC')
        .describe('Sort direction'),
      limit: z.number().optional().describe('Maximum number of records to return'),
      offset: z.number().optional().describe('Number of records to skip for pagination'),
      includeSubtables: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include subtable data in the response'),
      listingOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe('Only return fields shown on the listing page'),
      useFieldIds: z
        .boolean()
        .optional()
        .default(false)
        .describe('Use field IDs as keys instead of field names'),
      includeInfo: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include creation date and user info'),
      includeComments: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include record comments'),
      reverseOrder: z
        .boolean()
        .optional()
        .default(false)
        .describe('Reverse the default order (newest first)')
    })
  )
  .output(
    z.object({
      records: z
        .array(
          z.object({
            recordId: z.string().describe('The unique record ID'),
            fields: z
              .record(z.string(), z.any())
              .describe('Record field values keyed by field name or ID')
          })
        )
        .describe('List of matching records'),
      totalReturned: z.number().describe('Number of records returned in this response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverDomain: ctx.config.serverDomain,
      accountName: ctx.config.accountName
    });

    let sheet = {
      tabFolder: ctx.input.tabFolder,
      sheetIndex: ctx.input.sheetIndex
    };

    let data = await client.listRecords(sheet, {
      where: ctx.input.filters,
      fts: ctx.input.fullTextSearch,
      order: ctx.input.sortFieldId
        ? {
            fieldId: ctx.input.sortFieldId,
            direction: ctx.input.sortDirection || 'ASC'
          }
        : undefined,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      subtables: ctx.input.includeSubtables,
      listing: ctx.input.listingOnly,
      naming: ctx.input.useFieldIds ? 'EID' : 'FNAME',
      info: ctx.input.includeInfo,
      comment: ctx.input.includeComments,
      reverse: ctx.input.reverseOrder
    });

    let records = Object.entries(data).map(([recordId, recordData]: [string, any]) => ({
      recordId,
      fields: recordData
    }));

    return {
      output: {
        records,
        totalReturned: records.length
      },
      message: `Retrieved **${records.length}** record(s) from sheet **${ctx.input.tabFolder}/${ctx.input.sheetIndex}**.`
    };
  })
  .build();

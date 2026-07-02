import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRecords = SlateTool.create(spec, {
  name: 'List Records',
  key: 'list_records',
  description: `Retrieve records from a table with optional filtering, sorting, and pagination. Filters use field IDs (not field names) — use the **Get Table Schema** tool first to discover field IDs.`,
  instructions: [
    'Filters must use field IDs (e.g. "A", "B") not field names. Use Get Table Schema to discover field ID mappings.',
    'The default page size is 100 records. Use page and perPage to paginate through larger datasets.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      databaseId: z.string().describe('ID of the database'),
      tableId: z.string().describe('ID of the table (e.g. "A", "B")'),
      page: z.number().optional().describe('Page number (0-indexed). Defaults to 0.'),
      perPage: z.number().optional().describe('Number of records per page. Defaults to 100.'),
      order: z.string().optional().describe('Field name to sort by'),
      descending: z.boolean().optional().describe('Sort in descending order'),
      newestFirst: z.boolean().optional().describe('Show newest records first'),
      updatedFirst: z
        .boolean()
        .optional()
        .describe('Show most recently updated records first'),
      filters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter object using field IDs as keys (e.g. {"A": "Person", "B": "John"})'),
      choiceStyle: z
        .enum(['ids', 'names'])
        .optional()
        .describe('How to return choice field values: as IDs or display names')
    })
  )
  .output(
    z.object({
      records: z
        .array(
          z.object({
            recordId: z.number().describe('Unique record identifier'),
            sequence: z.number().optional().describe('Sequence number for change tracking'),
            createdAt: z.string().optional().describe('Record creation timestamp'),
            createdBy: z.string().optional().describe('User who created the record'),
            modifiedAt: z.string().optional().describe('Last modification timestamp'),
            modifiedBy: z.string().optional().describe('User who last modified the record'),
            fields: z
              .record(z.string(), z.any())
              .describe('Record field values keyed by field name')
          })
        )
        .describe('List of records'),
      totalCount: z.number().describe('Number of records returned in this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let records = await client.listRecords(
      ctx.input.teamId,
      ctx.input.databaseId,
      ctx.input.tableId,
      {
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        order: ctx.input.order,
        desc: ctx.input.descending,
        new: ctx.input.newestFirst,
        updated: ctx.input.updatedFirst,
        filters: ctx.input.filters,
        choiceStyle: ctx.input.choiceStyle
      }
    );

    return {
      output: {
        records: records.map(r => ({
          recordId: r.id,
          sequence: r.sequence,
          createdAt: r.createdAt,
          createdBy: r.createdBy,
          modifiedAt: r.modifiedAt,
          modifiedBy: r.modifiedBy,
          fields: r.fields
        })),
        totalCount: records.length
      },
      message: `Retrieved **${records.length}** record(s) from table **${ctx.input.tableId}**.`
    };
  })
  .build();

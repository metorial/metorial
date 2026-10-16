import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { tableKeySchema } from '../lib/types';
import { spec } from '../spec';

export let queryDataRecords = SlateTool.create(spec, {
  name: 'Query Data Records',
  key: 'query_data_records',
  description:
    'Query, retrieve, or count records from a table discovered with list_data_tables. Inspect field keys with get_data_table. Supports filters, selected fields, relationships, sorting, and pagination; returns actual records or counts and provider pagination.',
  constraints: [
    'Cursor pagination requires orderBy: { internalOrder: "asc" } on every page. Use either skip or after.',
    'Use either include or select. Maximum include depth is 3, at most 10 includes and 50 where conditions.',
    'Unique queries use recordId only, without where, orderBy, take, skip, or after. Many-to-many relationship includes are available only for unique queries.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      tableKey: tableKeySchema,
      mode: z
        .enum(['many', 'unique', 'count'])
        .describe(
          'many lists records, unique retrieves a record by ID, count returns the matching count'
        ),
      recordId: z
        .string()
        .optional()
        .describe('Required only for unique. Discover IDs with a many query.'),
      where: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Filter for many/count using field keys and equals, not, in, notIn, lt/lte/gt/gte, contains, startsWith, endsWith, AND/OR/NOT.'
        ),
      include: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Relationship includes for many/unique. Cannot combine with select.'),
      select: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Field selection for many/unique. Cannot combine with include.'),
      orderBy: z
        .union([z.record(z.string(), z.unknown()), z.array(z.record(z.string(), z.unknown()))])
        .optional()
        .describe('Sort field objects for many/count, e.g. { internalOrder: "asc" }.'),
      take: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Page size for many/count, 1-100. Provider default is 100.'),
      skip: z
        .number()
        .min(0)
        .max(10000)
        .optional()
        .describe('Offset for many/count. Cannot combine with after.'),
      after: z
        .union([z.number(), z.string()])
        .optional()
        .describe(
          'Previous result.pagination.endCursor for many/count. Requires orderBy: { internalOrder: "asc" }.'
        )
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.unknown())
        .describe(
          'Complete query result: records with pagination, a unique record, or _count, preserving selected fields and relationship data'
        ),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let output = await new Client({ token: ctx.auth.token }).queryDataRecords(
      ctx.input.tableKey,
      ctx.input
    );
    return { output, message: 'Completed the data record query.' };
  })
  .build();

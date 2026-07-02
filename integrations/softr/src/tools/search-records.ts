import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabaseClient } from '../lib/client';
import { spec } from '../spec';

let filterConditionSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    operator: z
      .string()
      .describe(
        'Filter operator (e.g., IS, IS_NOT, CONTAINS, GREATER_THAN, IS_EMPTY, AND, OR, IS_BETWEEN, etc.)'
      ),
    field: z
      .string()
      .optional()
      .describe('Field ID to filter on (for binary/unary operators)'),
    value: z.unknown().optional().describe('Value to compare against (for binary operators)'),
    values: z
      .array(z.unknown())
      .optional()
      .describe('Array of values (for IS_ONE_OF, IS_NOT_ONE_OF, HAS_ANY_OF, etc.)'),
    conditions: z
      .array(filterConditionSchema)
      .optional()
      .describe('Nested conditions (for AND/OR composite operators)')
  })
);

let sortSchema = z.object({
  sortingField: z.string().describe('Field ID to sort by'),
  sortType: z.enum(['ASC', 'DESC']).describe('Sort direction')
});

let recordSchema = z.object({
  recordId: z.string().describe('Unique record identifier'),
  tableId: z.string().describe('Table the record belongs to'),
  fields: z.record(z.string(), z.unknown()).describe('Field values'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let searchRecords = SlateTool.create(spec, {
  name: 'Search Records',
  key: 'search_records',
  description: `Search for records in a Softr table using filters, sorting, and pagination. Supports a rich set of filter operators for precise querying.

**Available filter operators:**
- **Comparison:** IS, IS_NOT, GREATER_THAN, GREATER_THAN_OR_EQUALS, LESS_THAN, LESS_THAN_OR_EQUALS
- **String matching:** CONTAINS, DOES_NOT_CONTAIN, STARTS_WITH, DOES_NOT_START_WITH, ENDS_WITH, DOES_NOT_END_WITH
- **Array:** IS_ONE_OF, IS_NOT_ONE_OF, HAS_ANY_OF, HAS_ALL_OF, HAS_NONE_OF
- **Null checks:** IS_EMPTY, IS_NOT_EMPTY
- **Range:** IS_BETWEEN, IS_NOT_BETWEEN, IS_WITHIN, IS_NOT_WITHIN
- **Composite:** AND, OR (for combining multiple conditions)`,
  instructions: [
    'Wrap conditions in an AND or OR operator to combine multiple filters.',
    'Set `fieldNames` to true to use human-readable field names in the response.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database'),
      tableId: z.string().describe('ID of the table to search'),
      filter: z
        .object({
          condition: filterConditionSchema
        })
        .optional()
        .describe('Filter conditions for the search'),
      sort: z.array(sortSchema).optional().describe('Sorting rules'),
      offset: z.number().optional().describe('Number of records to skip (default 0)'),
      limit: z.number().optional().describe('Maximum records to return (default 50, max 200)'),
      fieldNames: z
        .boolean()
        .optional()
        .describe('Use field names instead of IDs as keys in the response')
    })
  )
  .output(
    z.object({
      records: z.array(recordSchema).describe('Matching records'),
      total: z.number().optional().describe('Total number of matching records'),
      offset: z.number().optional().describe('Current offset'),
      limit: z.number().optional().describe('Current limit')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabaseClient({ token: ctx.auth.token });

    let paging =
      ctx.input.offset !== undefined || ctx.input.limit !== undefined
        ? { offset: ctx.input.offset, limit: ctx.input.limit }
        : undefined;

    let result = await client.searchRecords(ctx.input.databaseId, ctx.input.tableId, {
      filter: ctx.input.filter,
      sort: ctx.input.sort,
      paging,
      fieldNames: ctx.input.fieldNames
    });

    let records = (result.data || []).map((r: any) => ({
      recordId: r.id,
      tableId: r.tableId,
      fields: r.fields || {},
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
    let metadata = result.metadata || {};

    return {
      output: {
        records,
        total: metadata.total,
        offset: metadata.offset,
        limit: metadata.limit
      },
      message: `Found **${records.length}** record(s)${metadata.total !== undefined ? ` out of ${metadata.total} matching` : ''}.`
    };
  })
  .build();

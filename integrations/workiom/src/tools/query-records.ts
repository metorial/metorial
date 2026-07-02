import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let queryRecords = SlateTool.create(spec, {
  name: 'Query Records',
  key: 'query_records',
  description: `Retrieves records from a Workiom list with optional filtering, sorting, and pagination. Returns record data where each record is a JSON object with field IDs as keys.

Use filters to narrow results by field values. Supported filter operators:
- **1** = Contains, **2** = DoesNotContain, **3** = Is, **4** = IsNot
- **5** = GreaterThan, **6** = LessThan, **7** = IsEmpty, **8** = IsNotEmpty
- **11** = Between`,
  instructions: [
    'Get list metadata first to find field IDs for filtering and sorting.',
    'Sorting format: "fieldId ASC" or "fieldId DESC".',
    'Filter values should match the field data type.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to query records from'),
      maxResultCount: z.number().optional().describe('Maximum number of records to return'),
      skipCount: z.number().optional().describe('Number of records to skip (for pagination)'),
      sorting: z
        .string()
        .optional()
        .describe('Sorting expression, e.g. "12345 ASC" or "12345 DESC"'),
      filters: z
        .array(
          z.object({
            fieldId: z.number().describe('ID of the field to filter on'),
            operator: z
              .number()
              .describe(
                'Filter operator (1=Contains, 3=Is, 5=Greater, 6=Less, 7=IsEmpty, 11=Between)'
              ),
            value: z.any().describe('Filter value matching the field data type')
          })
        )
        .optional()
        .describe('Array of filter objects for granular record filtering')
    })
  )
  .output(
    z.object({
      totalCount: z.number().optional().describe('Total number of matching records'),
      records: z.array(z.any()).describe('Array of record objects with field IDs as keys'),
      summary: z.any().optional().describe('Summary data if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.queryRecords({
      listId: ctx.input.listId,
      maxResultCount: ctx.input.maxResultCount,
      skipCount: ctx.input.skipCount,
      sorting: ctx.input.sorting,
      filters: ctx.input.filters
    });

    let records = result?.items ?? result?.data ?? [];
    let totalCount = result?.totalCount ?? records.length;

    return {
      output: {
        totalCount,
        records,
        summary: result?.summary
      },
      message: `Retrieved **${records.length}** record(s) out of **${totalCount}** total from list **${ctx.input.listId}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let constraintSchema = z.object({
  key: z.string().describe('Field name to apply the constraint on.'),
  constraintType: z
    .string()
    .describe(
      'Type of constraint. Common values: "equals", "not equal", "is_empty", "is_not_empty", "text contains", "not text contains", "greater than", "less than", "in", "not in", "contains", "not contains", "empty", "not empty", "geographic_search".'
    ),
  value: z
    .any()
    .optional()
    .describe(
      'Value to compare against. Not needed for "is_empty" / "is_not_empty" constraints.'
    )
});

export let searchRecords = SlateTool.create(spec, {
  name: 'Search Records',
  key: 'search_records',
  description: `Search and filter records in a Bubble data type. Supports powerful constraint-based filtering, sorting, and pagination. Use this to find records matching specific criteria or to list all records of a given type.`,
  instructions: [
    'Constraint types include: "equals", "not equal", "is_empty", "is_not_empty", "text contains", "not text contains", "greater than", "less than", "in", "not in", "contains", "not contains", "geographic_search".',
    'For geographic searches, use constraint_type "geographic_search" with a value of { range: <meters>, origin_address: "<address>" }.',
    'The maximum number of records returned per request is 100. Use cursor-based pagination to retrieve more.'
  ],
  constraints: ['Maximum 100 records per request. Use cursor for pagination.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dataType: z.string().describe('Name of the Bubble data type (table) to search in.'),
      constraints: z
        .array(constraintSchema)
        .optional()
        .describe('Array of filter constraints. Omit to return all records.'),
      sortField: z.string().optional().describe('Field name to sort results by.'),
      descending: z
        .boolean()
        .optional()
        .describe('Sort in descending order. Defaults to false (ascending).'),
      limit: z.number().optional().describe('Maximum number of records to return (max 100).'),
      cursor: z
        .number()
        .optional()
        .describe(
          'Pagination cursor. Use the cursor value from a previous response to get the next page.'
        )
    })
  )
  .output(
    z.object({
      records: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of matching records with all field values.'),
      count: z.number().describe('Total number of records matching the query.'),
      remaining: z.number().describe('Number of records remaining after the current page.'),
      cursor: z
        .number()
        .describe(
          'Cursor position for pagination. Pass this as the cursor input to get the next page.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.appBaseUrl,
      token: ctx.auth?.token
    });

    let bubbleConstraints = ctx.input.constraints?.map(c => ({
      key: c.key,
      constraint_type: c.constraintType,
      value: c.value
    }));

    let result = await client.searchRecords(ctx.input.dataType, {
      constraints: bubbleConstraints,
      sortField: ctx.input.sortField,
      descending: ctx.input.descending,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    return {
      output: {
        records: result.results,
        count: result.count,
        remaining: result.remaining,
        cursor: result.cursor
      },
      message: `Found **${result.count}** ${ctx.input.dataType} record(s). Returned ${result.results.length} record(s), ${result.remaining} remaining.`
    };
  })
  .build();

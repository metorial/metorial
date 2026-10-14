import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let filterPropertySchema = z.object({
  property: z
    .string()
    .describe(
      'Property name to filter on (e.g. "name", "creationTime", "editedDate", "lifecycleStatus").'
    ),
  operation: z
    .enum(['EQ', 'CONTAINS', 'NOT_EMPTY', 'GT', 'LT', 'GE', 'LE', 'NE', 'NOT_CONTAINS'])
    .describe('Filter operation.'),
  value: z.string().describe('Value to compare against. For dates use format "YYYY-MM-DD".'),
  typedValue: z
    .union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])
    .optional()
    .describe(
      'Optional typed filter value. Overrides value for numeric, boolean, array, or empty custom-field comparisons.'
    ),
  isCustomField: z.boolean().optional().describe('Set to true if filtering on a custom field.')
});

export let searchItems = SlateTool.create(spec, {
  name: 'Search Work Items',
  key: 'search_items',
  description: `Searches for work items (tickets, tasks, etc.) using filter criteria.
Supports filtering by name, creation time, status, and custom fields.
Use operations like EQ (equals), CONTAINS, GT/LT (greater/less than) for flexible querying.`,
  instructions: [
    'Provide at least one filter property for meaningful results.',
    'Use itemTypes to narrow results to specific work item types.',
    'Date values should use the format "YYYY-MM-DD".'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filters: z
        .array(filterPropertySchema)
        .optional()
        .describe('Filter conditions to apply to the search.'),
      itemTypes: z
        .array(z.string())
        .optional()
        .describe(
          'Item type names from get_organization itemTypes labels. If omitted, all discovered types are searched.'
        ),
      sortAscending: z
        .boolean()
        .optional()
        .default(false)
        .describe('Sort results in ascending order by creation time.'),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe(
          'Maximum number of results to return, a whole number from 1 to 50 (default 50).'
        ),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe('Number of results to skip for pagination, a non-negative whole number.')
    })
  )
  .output(
    z.object({
      items: z.array(z.record(z.string(), z.any())).describe('List of matching work items.'),
      count: z.number().describe('Number of items returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let items = await client.searchItems({
      properties: ctx.input.filters?.map(f => ({
        property: f.property,
        operation: f.operation,
        value: f.value,
        isCustomField: f.isCustomField,
        typedValue: f.typedValue
      })),
      itemType: ctx.input.itemTypes,
      isAsc: ctx.input.sortAscending,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let resultItems = Array.isArray(items) ? items : [];

    return {
      output: {
        items: resultItems,
        count: resultItems.length
      },
      message: `Found **${resultItems.length}** work item(s) matching the search criteria.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let filterPropertySchema = z.object({
  property: z
    .string()
    .describe(
      'Property name to filter on (e.g. "name", "creationTime", "dueDate", "invoiceType").'
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

export let searchProjects = SlateTool.create(spec, {
  name: 'Search Projects',
  key: 'search_projects',
  description: `Searches for projects using filter criteria.
Supports filtering by name, creation time, due date, invoice type, and custom fields.
Returns matching projects with their full details.`,
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
      sortAscending: z
        .boolean()
        .optional()
        .default(false)
        .describe('Sort results in ascending order.'),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe('Maximum number of results to return, a whole number from 1 to 50.'),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe('Number of results to skip for pagination, a non-negative whole number.')
    })
  )
  .output(
    z.object({
      projects: z.array(z.record(z.string(), z.any())).describe('List of matching projects.'),
      count: z.number().describe('Number of projects returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let projects = await client.searchProjects({
      properties: ctx.input.filters?.map(f => ({
        property: f.property,
        operation: f.operation,
        value: f.value,
        isCustomField: f.isCustomField,
        typedValue: f.typedValue
      })),
      isAsc: ctx.input.sortAscending,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let resultProjects = Array.isArray(projects) ? projects : [];

    return {
      output: {
        projects: resultProjects,
        count: resultProjects.length
      },
      message: `Found **${resultProjects.length}** project(s) matching the search criteria.`
    };
  })
  .build();

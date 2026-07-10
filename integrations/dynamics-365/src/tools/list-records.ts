import { SlateTool } from 'slates';
import { z } from 'zod';
import { createDynamicsClient, dataverseContinuation } from '../lib/client';
import { spec } from '../spec';

export let listRecords = SlateTool.create(spec, {
  name: 'List Records',
  key: 'list_records',
  description: `Query and list records from any Dynamics 365 Dataverse table with support for OData filtering, sorting, column selection, pagination, and expanding related records.
Use this to retrieve multiple records based on criteria. Supports standard OData query options.`,
  instructions: [
    'Use OData filter syntax for the filter parameter, e.g., "statecode eq 0", "name eq \'Contoso\'", "createdon gt 2024-01-01".',
    'Use OData orderby syntax, e.g., "createdon desc", "name asc".',
    'To paginate, pass the nextLink value from the previous response as the skipToken parameter.'
  ],
  constraints: ['Maximum of 5000 records per page by default. Use $top to limit results.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      entitySetName: z
        .string()
        .describe(
          'OData entity set name (e.g., "accounts", "contacts", "leads", "opportunities")'
        ),
      select: z.array(z.string()).optional().describe('List of column names to return'),
      filter: z
        .string()
        .optional()
        .describe('OData $filter expression (e.g., "statecode eq 0 and revenue gt 1000000")'),
      orderBy: z
        .string()
        .optional()
        .describe('OData $orderby expression (e.g., "createdon desc")'),
      top: z.number().optional().describe('Maximum number of records to return'),
      expand: z.string().optional().describe('Navigation property to expand for related data'),
      pageSize: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Preferred Dataverse page size, capped by Dataverse limits'),
      includeCount: z.boolean().optional().describe('Whether to request @odata.count'),
      skipToken: z
        .string()
        .optional()
        .describe('Backward-compatible pagination token. Pass a prior nextLink value.'),
      nextLink: z
        .string()
        .optional()
        .describe('Dataverse @odata.nextLink from a previous response'),
      includeAnnotations: z
        .boolean()
        .optional()
        .describe(
          'When true, includes OData annotations such as formatted values and lookup logical names'
        )
    })
  )
  .output(
    z.object({
      entitySetName: z.string().describe('OData entity set name queried'),
      records: z.array(z.record(z.string(), z.any())).describe('Array of matching records'),
      count: z.number().optional().describe('Total count when includeCount is true'),
      nextLink: z
        .string()
        .nullable()
        .describe('Pagination URL for the next page of results, or null if no more pages'),
      continuation: z
        .object({
          nextLink: z.string().nullable(),
          count: z.number().optional()
        })
        .describe('Continuation metadata for downstream pagination')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);

    let result = await client.listRecords(ctx.input.entitySetName, {
      select: ctx.input.select,
      filter: ctx.input.filter,
      orderBy: ctx.input.orderBy,
      top: ctx.input.top,
      expand: ctx.input.expand,
      pageSize: ctx.input.pageSize,
      includeCount: ctx.input.includeCount,
      nextLink: ctx.input.nextLink ?? ctx.input.skipToken,
      includeAnnotations: ctx.input.includeAnnotations
    });

    return {
      output: {
        entitySetName: ctx.input.entitySetName,
        records: result.records,
        count: result.count,
        nextLink: result.nextLink,
        continuation: dataverseContinuation(result)
      },
      message: `Retrieved **${result.records.length}** records from **${ctx.input.entitySetName}**.${result.nextLink ? ' More results are available.' : ''}`
    };
  })
  .build();

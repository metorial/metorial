import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let whereClauseSchema = z.object({
  type: z
    .string()
    .describe(
      'Filter type: equals, notEquals, contains, startsWith, endsWith, greaterThan, lessThan, greaterThanOrEquals, lessThanOrEquals, isNull, isNotNull, isTrue, isFalse, in, linkedWith, etc.'
    ),
  attribute: z.string().optional().describe('Field name to filter on'),
  value: z
    .any()
    .optional()
    .describe('Value to filter by (string, number, or array for "in" type)')
});

export let listRecords = SlateTool.create(spec, {
  name: 'List Records',
  key: 'list_records',
  description: `List and filter records of any entity type in EspoCRM. Supports pagination, sorting, field selection, text search, and advanced where-clause filtering. Works with both built-in and custom entity types.`,
  instructions: [
    'Common entity types: Contact, Account, Lead, Opportunity, Case, Meeting, Call, Task, Email.',
    'Where clause types include: equals, notEquals, contains, startsWith, greaterThan, lessThan, isNull, isNotNull, in.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityType: z
        .string()
        .describe('Entity type to list (e.g., Contact, Account, Lead, Opportunity, Case)'),
      textFilter: z.string().optional().describe('Full-text search query'),
      where: z
        .array(whereClauseSchema)
        .optional()
        .describe('Array of where clauses for advanced filtering'),
      select: z
        .array(z.string())
        .optional()
        .describe('Fields to include in results (returns all if not specified)'),
      orderBy: z.string().optional().describe('Field to sort by (e.g., createdAt, name)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      maxSize: z
        .number()
        .optional()
        .describe('Maximum number of records to return (default 20, max 200)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.any())).describe('Array of matching records'),
      total: z.number().describe('Total number of matching records'),
      hasMore: z.boolean().describe('Whether more records are available beyond this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let maxSize = Math.min(ctx.input.maxSize || 20, 200);
    let offset = ctx.input.offset || 0;

    let result = await client.listRecords(ctx.input.entityType, {
      textFilter: ctx.input.textFilter,
      where: ctx.input.where,
      select: ctx.input.select,
      orderBy: ctx.input.orderBy,
      order: ctx.input.order,
      maxSize,
      offset
    });

    return {
      output: {
        records: result.list,
        total: result.total,
        hasMore: offset + result.list.length < result.total
      },
      message: `Retrieved **${result.list.length}** of **${result.total}** ${ctx.input.entityType} records.`
    };
  })
  .build();

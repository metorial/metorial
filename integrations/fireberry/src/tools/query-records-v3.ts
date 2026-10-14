import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let scalar = z.union([z.string(), z.number(), z.boolean()]);

export let queryRecordsV3 = SlateTool.create(spec, {
  name: 'Query Records with Structured Filters',
  key: 'query_records_v3',
  description:
    'Search, sort, aggregate, and paginate Fireberry records using structured filters. Call list_objects to discover object numbers and list_object_fields to discover field names.',
  instructions: [
    'Condition groups are combined with AND; each group chooses AND or OR for its conditions.',
    'Use groupBy for aggregation. Every selected field without aggrFunc and every orderBy field must appear in groupBy.',
    'Use relative date values such as today, this-month, or last-30-days with comparison operators on date fields.',
    'When isLastPage is false, increment pageNumber to retrieve the next page.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      objectType: z
        .number()
        .int()
        .positive()
        .describe(
          'Object type number. Call list_objects to discover available object numbers.'
        ),
      fields: z
        .array(
          z.object({
            name: z
              .string()
              .min(1)
              .describe('System field name, or related field such as ownerid_fullname.'),
            alias: z
              .string()
              .optional()
              .describe('Result field name for an aggregated field.'),
            aggrFunc: z
              .enum(['SUM', 'COUNT', 'MIN', 'MAX'])
              .optional()
              .describe('Aggregation function; requires a nonempty groupBy.')
          })
        )
        .min(1)
        .describe(
          'Fields to return. Include ID fields when you need to use returned records in other tools.'
        ),
      filter: z
        .array(
          z.object({
            type: z.enum(['AND', 'OR']),
            conditions: z
              .array(
                z.object({
                  fieldName: z.string().min(1),
                  operator: z.enum([
                    'eq',
                    'ne',
                    'lt',
                    'gt',
                    'le',
                    'ge',
                    'start-with',
                    'not-start-with',
                    'is-null',
                    'is-not-null',
                    'eq-in',
                    'not-in',
                    'between',
                    'userid'
                  ]),
                  value: z
                    .union([scalar, z.array(scalar)])
                    .optional()
                    .describe(
                      'Scalar for comparisons, array for eq-in/not-in, exactly two values for between. Omit for is-null/is-not-null/userid.'
                    )
                })
              )
              .min(1)
          })
        )
        .optional(),
      orderBy: z
        .array(
          z.object({
            name: z.string().min(1),
            order: z.enum(['asc', 'desc']).optional()
          })
        )
        .optional(),
      groupBy: z
        .array(
          z.object({
            name: z.string().min(1),
            datePeriod: z
              .enum([
                'HOUR',
                'DAY',
                'WEEK',
                'MONTH',
                'QUARTER',
                'YEAR',
                'HOUR_PART',
                'DAY_PART',
                'WEEK_PART',
                'MONTH_PART',
                'QUARTER_PART',
                'DAY_OF_WEEK'
              ])
              .optional()
              .describe('Time bucket for Date or DateTime fields only.')
          })
        )
        .optional(),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Records per page, 1–500 (default 25).'),
      pageNumber: z.number().int().min(1).optional().describe('Page number, starting at 1.')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.any())),
      pageSize: z.number(),
      pageNumber: z.number(),
      isLastPage: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    for (let group of ctx.input.filter ?? []) {
      for (let condition of group.conditions) {
        let noValue = ['is-null', 'is-not-null', 'userid'].includes(condition.operator);
        let arrayValue = ['eq-in', 'not-in', 'between'].includes(condition.operator);
        if (noValue ? condition.value !== undefined : condition.value === undefined) {
          throw createApiServiceError(
            noValue
              ? `Omit value for the ${condition.operator} operator.`
              : `Provide value for the ${condition.operator} operator.`
          );
        }
        if (!noValue && Array.isArray(condition.value) !== arrayValue) {
          throw createApiServiceError(
            arrayValue
              ? `Provide an array value for the ${condition.operator} operator.`
              : `Provide a scalar value for the ${condition.operator} operator.`
          );
        }
        if (
          condition.operator === 'between' &&
          Array.isArray(condition.value) &&
          condition.value.length !== 2
        ) {
          throw createApiServiceError('The between operator requires exactly two values.');
        }
      }
    }
    let grouped = new Set(ctx.input.groupBy?.map(field => field.name));
    if (ctx.input.fields.some(field => field.aggrFunc) && grouped.size === 0) {
      throw createApiServiceError(
        'Provide a nonempty groupBy when using aggregation functions.'
      );
    }
    if (
      grouped.size > 0 &&
      (ctx.input.fields.some(field => !field.aggrFunc && !grouped.has(field.name)) ||
        ctx.input.orderBy?.some(field => !grouped.has(field.name)))
    ) {
      throw createApiServiceError(
        'Every selected field without an aggregation function and every sort field must be included in groupBy.'
      );
    }
    let client = new Client(ctx.auth.token);
    let result = await client.queryV3(ctx.input);
    if (
      !result ||
      !Array.isArray(result.data) ||
      typeof result.isLastPage !== 'boolean' ||
      typeof result.pageNumber !== 'number' ||
      typeof result.pageSize !== 'number'
    ) {
      throw createApiServiceError('Fireberry returned an unexpected query response.');
    }
    return {
      output: {
        records: result.data,
        pageSize: result.pageSize,
        pageNumber: result.pageNumber,
        isLastPage: result.isLastPage
      },
      message: `Retrieved **${result.data.length}** results on page ${result.pageNumber}.`
    };
  })
  .build();

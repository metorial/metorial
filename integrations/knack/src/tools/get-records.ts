import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KnackClient, resolveApplicationId } from '../lib/client';
import { spec } from '../spec';

let filterRuleSchema = z.object({
  field: z.string().describe('Field key to filter on (e.g., "field_1")'),
  operator: z
    .enum([
      'is',
      'is not',
      'contains',
      'does not contain',
      'starts with',
      'ends with',
      'is blank',
      'is not blank',
      'higher than',
      'lower than',
      'is before',
      'is after',
      'is during the current',
      'is during the previous',
      'is during the next',
      'is before the previous',
      'is after the next'
    ])
    .describe('Comparison operator'),
  value: z.string().describe('Value to compare against'),
  range: z.number().optional().describe('Relative date range, such as 3'),
  type: z.string().optional().describe('Relative date unit, such as months')
});

export let getRecords = SlateTool.create(spec, {
  name: 'Get Records',
  key: 'get_records',
  description: `Retrieve records from a Knack object or view with optional filtering, sorting, and pagination. Supports both object-based access (full data access via API key) and view-based access (scoped to a specific page and view). Use filters to narrow results by field values and sorting to control the order.`,
  instructions: [
    'Use objectKey (e.g., "object_1") for object-based access, or sceneKey + viewKey for view-based access.',
    'Call get_app_metadata to discover object, field, scene, and view keys. For connection filters, use the connection field key, operator is, and the connected record ID.',
    'A connected child view needs parentPageSlug and parentRecordId. Results follow the view source and permissions.',
    'Filters use Knack field keys (e.g., "field_1") and support operators like "is", "contains", "higher than", etc.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectKey: z
        .string()
        .optional()
        .describe(
          'Object key (e.g., "object_1") for object-based requests; call get_app_metadata to discover keys'
        ),
      sceneKey: z
        .string()
        .optional()
        .describe(
          'Scene/page key (e.g., "scene_1") for view-based requests; call get_app_metadata to discover keys'
        ),
      viewKey: z
        .string()
        .optional()
        .describe(
          'View key (e.g., "view_1") for view-based requests; call get_app_metadata to discover keys'
        ),
      page: z.number().optional().describe('Page number for pagination (defaults to 1)'),
      rowsPerPage: z
        .number()
        .optional()
        .describe('Number of records per page (defaults to 25, max 1000)'),
      sortField: z.string().optional().describe('Field key to sort by (e.g., "field_1")'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      parentPageSlug: z
        .string()
        .optional()
        .describe(
          'Child page URL slug for a connected view, such as company-details; requires parentRecordId'
        ),
      parentRecordId: z
        .string()
        .optional()
        .describe('Parent record ID for a connected child view; requires parentPageSlug'),
      advancedFilters: z
        .object({
          match: z.enum(['and', 'or']),
          rules: z.array(
            z.object({
              field: z.string(),
              operator: z
                .string()
                .describe(
                  'An operator supported by the Knack field type, such as is any or is today'
                ),
              value: z
                .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
                .optional()
                .describe('Omit for operators such as is blank'),
              range: z.number().optional(),
              type: z.string().optional().describe('Relative date unit, such as months')
            })
          )
        })
        .optional()
        .describe(
          'Extended Knack filters including valueless and relative-date rules; do not combine with filters'
        ),
      filters: z
        .object({
          match: z.enum(['and', 'or']).describe('How to combine filter rules'),
          rules: z.array(filterRuleSchema).describe('Filter rules to apply')
        })
        .optional()
        .describe('Filter configuration for narrowing results')
    })
  )
  .output(
    z.object({
      records: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of record objects with field key-value pairs'),
      totalPages: z.number().describe('Total number of pages available'),
      totalRecords: z.number().describe('Total number of records matching the query'),
      currentPage: z.number().describe('Current page number'),
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('Complete provider response, including pagination and record data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KnackClient({
      applicationId: resolveApplicationId(ctx.auth, ctx.config),
      token: ctx.auth.token,
      authMode: ctx.auth.authMode
    });

    if (ctx.input.filters && ctx.input.advancedFilters)
      throw createApiServiceError('Use filters or advancedFilters, not both.');

    let options = {
      page: ctx.input.page,
      rowsPerPage: ctx.input.rowsPerPage,
      sortField: ctx.input.sortField,
      sortOrder: ctx.input.sortOrder,
      filters: ctx.input.advancedFilters ?? ctx.input.filters,
      parentPageSlug: ctx.input.parentPageSlug,
      parentRecordId: ctx.input.parentRecordId
    };

    let result: any;

    if (ctx.input.sceneKey && ctx.input.viewKey) {
      ctx.info(
        `Fetching records via view-based access: ${ctx.input.sceneKey}/${ctx.input.viewKey}`
      );
      result = await client.listViewRecords(ctx.input.sceneKey, ctx.input.viewKey, options);
    } else if (ctx.input.objectKey) {
      ctx.info(`Fetching records via object-based access: ${ctx.input.objectKey}`);
      result = await client.listObjectRecords(ctx.input.objectKey, options);
    } else {
      throw createApiServiceError(
        'Provide objectKey or both sceneKey and viewKey. Call get_app_metadata to discover keys.'
      );
    }

    return {
      output: result,
      message: `Retrieved **${result.records.length}** records (page ${result.currentPage} of ${result.totalPages}, ${result.totalRecords} total).`
    };
  })
  .build();

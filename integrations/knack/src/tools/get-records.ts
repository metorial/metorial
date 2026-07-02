import { SlateTool } from 'slates';
import { z } from 'zod';
import { KnackClient } from '../lib/client';
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
  value: z.string().describe('Value to compare against')
});

export let getRecords = SlateTool.create(spec, {
  name: 'Get Records',
  key: 'get_records',
  description: `Retrieve records from a Knack object or view with optional filtering, sorting, and pagination. Supports both object-based access (full data access via API key) and view-based access (scoped to a specific page and view). Use filters to narrow results by field values and sorting to control the order.`,
  instructions: [
    'Use objectKey (e.g., "object_1") for object-based access, or sceneKey + viewKey for view-based access.',
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
        .describe('Object key (e.g., "object_1") for object-based requests'),
      sceneKey: z
        .string()
        .optional()
        .describe('Scene/page key (e.g., "scene_1") for view-based requests'),
      viewKey: z
        .string()
        .optional()
        .describe('View key (e.g., "view_1") for view-based requests'),
      page: z.number().optional().describe('Page number for pagination (defaults to 1)'),
      rowsPerPage: z
        .number()
        .optional()
        .describe('Number of records per page (defaults to 25, max 1000)'),
      sortField: z.string().optional().describe('Field key to sort by (e.g., "field_1")'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
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
      currentPage: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KnackClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token,
      authMode: ctx.auth.authMode
    });

    let options = {
      page: ctx.input.page,
      rowsPerPage: ctx.input.rowsPerPage,
      sortField: ctx.input.sortField,
      sortOrder: ctx.input.sortOrder,
      filters: ctx.input.filters
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
      throw new Error('Either objectKey or both sceneKey and viewKey must be provided');
    }

    return {
      output: result,
      message: `Retrieved **${result.records.length}** records (page ${result.currentPage} of ${result.totalPages}, ${result.totalRecords} total).`
    };
  })
  .build();

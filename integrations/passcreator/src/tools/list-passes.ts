import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPasses = SlateTool.create(spec, {
  name: 'List Passes',
  key: 'list_passes',
  description: `Retrieve a paginated list of passes for a specific template, or search/filter passes using the V3 query language. Supports filtering by segment, custom query conditions, creation date, and modification date.`,
  instructions: [
    'For basic listing by template, provide templateId.',
    'For advanced filtering, use the query parameter with Passcreator query language conditions.',
    'The query supports operators: equals, notEquals, contains, doesNotContain, greaterThan, lowerThan, beginsWith, endsWith, empty, notEmpty, isTrue, isFalse.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      nextPageUrl: z
        .string()
        .optional()
        .describe(
          'Continuation URL returned by a previous list_passes call. Other filters are already included in this URL.'
        ),
      templateId: z
        .string()
        .optional()
        .describe('Template identifier to list passes for (V1 paginated listing)'),
      pageSize: z
        .number()
        .optional()
        .default(100)
        .describe('Number of passes per page (max 100)'),
      start: z.number().optional().describe('Offset for pagination (V1)'),
      createdSince: z
        .string()
        .optional()
        .describe('Only return passes created since this date ("Y-m-d H:i")'),
      modifiedSince: z
        .string()
        .optional()
        .describe('Only return passes modified since this date ("Y-m-d H:i")'),
      searchText: z
        .string()
        .optional()
        .describe('Search text for fuzzy matching (requires templateId)'),
      segmentId: z.string().optional().describe('Segment ID to filter passes (V3)'),
      query: z
        .object({
          templateId: z.string().optional().describe('Template ID to filter by'),
          projectId: z.string().optional().describe('Project ID to filter by'),
          searchPhrase: z.string().optional().describe('Wildcard search string'),
          groups: z
            .array(
              z.array(
                z.object({
                  field: z.string().describe('Field name to filter on'),
                  operator: z
                    .string()
                    .describe('Operator (equals, contains, greaterThan, etc.)'),
                  value: z.any().describe('Value(s) to match against')
                })
              )
            )
            .optional()
            .describe('Groups of filter conditions (inner arrays are AND, outer are OR)')
        })
        .optional()
        .describe('Advanced query filter using Passcreator query language (V3)'),
      fields: z
        .string()
        .optional()
        .describe('Comma-separated field names to include in the response (V3)')
    })
  )
  .output(
    z.object({
      passes: z
        .array(z.record(z.string(), z.any()))
        .describe('List of passes matching the criteria'),
      totalCount: z.number().optional().describe('Total number of matching passes'),
      nextPageUrl: z
        .string()
        .optional()
        .describe('Continuation URL to pass to list_passes for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (
      !Number.isInteger(ctx.input.pageSize) ||
      ctx.input.pageSize < 1 ||
      ctx.input.pageSize > 100
    ) {
      throw createApiServiceError('pageSize must be an integer from 1 to 100.');
    }
    if (
      ctx.input.start !== undefined &&
      (!Number.isInteger(ctx.input.start) || ctx.input.start < 0)
    ) {
      throw createApiServiceError('start must be a nonnegative integer.');
    }
    if (ctx.input.searchText && !ctx.input.templateId) {
      throw createApiServiceError(
        'templateId is required when searchText is provided. Call list_templates to find a template.'
      );
    }
    if (ctx.input.searchText && (ctx.input.query || ctx.input.segmentId)) {
      throw createApiServiceError(
        'Use searchText or the advanced query/segment filters in separate calls.'
      );
    }
    if (ctx.input.searchText && ctx.input.templateId && !ctx.input.nextPageUrl) {
      let passes = await client.searchPasses(ctx.input.templateId, ctx.input.searchText);
      return {
        output: { passes, totalCount: passes.length },
        message: `Found **${passes.length}** pass(es) matching "${ctx.input.searchText}".`
      };
    }

    let result: any;
    if (ctx.input.nextPageUrl) {
      result = await client.listPassesPage(ctx.input.nextPageUrl);
    } else if (ctx.input.query || ctx.input.segmentId || !ctx.input.templateId) {
      let query = ctx.input.query;
      if (ctx.input.templateId) {
        if (query?.templateId && query.templateId !== ctx.input.templateId) {
          throw createApiServiceError(
            'templateId and query.templateId must identify the same template.'
          );
        }
        query = { ...query, templateId: ctx.input.templateId };
      }
      if (ctx.input.start !== undefined || ctx.input.createdSince || ctx.input.modifiedSince) {
        throw createApiServiceError(
          'start, createdSince, and modifiedSince require a basic template listing. Use query conditions for advanced filtering.'
        );
      }
      result = await client.listPassesV3({
        pageSize: ctx.input.pageSize,
        segmentId: ctx.input.segmentId,
        query: query ? Buffer.from(JSON.stringify(query)).toString('base64url') : undefined,
        fields: ctx.input.fields
      });
    } else {
      result = await client.listPasses(ctx.input.templateId, {
        start: ctx.input.start,
        pageSize: ctx.input.pageSize,
        createdSince: ctx.input.createdSince,
        modifiedSince: ctx.input.modifiedSince
      });
    }

    let data = Array.isArray(result)
      ? result
      : (result.results ?? result.passes ?? result.data ?? []);
    let passes = Array.isArray(data) ? data : [data];
    let totalCount =
      result.responseMetaData?.resultsTotal ?? result.total ?? result.count ?? passes.length;
    let nextPageUrl = result.page?.next ?? result.query?.next ?? undefined;
    return {
      output: { passes, totalCount, nextPageUrl },
      message: `Retrieved **${passes.length}** pass(es).${nextPageUrl ? ' More results are available using nextPageUrl.' : ''}`
    };
  })
  .build();

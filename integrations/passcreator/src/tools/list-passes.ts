import { SlateTool } from 'slates';
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
      totalCount: z.number().optional().describe('Total number of matching passes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    // Use search if searchText is provided with templateId
    if (ctx.input.searchText && ctx.input.templateId) {
      let passes = await client.searchPasses(ctx.input.templateId, ctx.input.searchText);
      return {
        output: { passes, totalCount: passes.length },
        message: `Found **${passes.length}** pass(es) matching "${ctx.input.searchText}".`
      };
    }

    // Use V3 if query or segmentId is provided
    if (ctx.input.query || ctx.input.segmentId) {
      let queryStr: string | undefined;
      if (ctx.input.query) {
        queryStr = Buffer.from(JSON.stringify(ctx.input.query)).toString('base64');
      }
      let result = await client.listPassesV3({
        pageSize: ctx.input.pageSize,
        segmentId: ctx.input.segmentId,
        query: queryStr,
        fields: ctx.input.fields
      });
      let data = result.data || [];
      let total = result.responseMetaData?.resultsTotal || result.count;
      return {
        output: { passes: Array.isArray(data) ? data : [data], totalCount: total },
        message: `Found **${total ?? (Array.isArray(data) ? data.length : 1)}** pass(es).`
      };
    }

    // Default V1 listing by template
    if (!ctx.input.templateId) {
      // Use V3 list all
      let result = await client.listPassesV3({
        pageSize: ctx.input.pageSize,
        fields: ctx.input.fields
      });
      let data = result.data || [];
      let total = result.responseMetaData?.resultsTotal || result.count;
      return {
        output: { passes: Array.isArray(data) ? data : [data], totalCount: total },
        message: `Found **${total ?? (Array.isArray(data) ? data.length : 1)}** pass(es).`
      };
    }

    let result = await client.listPasses(ctx.input.templateId, {
      start: ctx.input.start,
      pageSize: ctx.input.pageSize,
      createdSince: ctx.input.createdSince,
      modifiedSince: ctx.input.modifiedSince
    });

    let passes = Array.isArray(result) ? result : result.passes || result.data || [result];
    return {
      output: { passes, totalCount: passes.length },
      message: `Retrieved **${passes.length}** pass(es) from template \`${ctx.input.templateId}\`.`
    };
  })
  .build();

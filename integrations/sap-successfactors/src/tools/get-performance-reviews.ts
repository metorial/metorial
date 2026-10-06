import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invalid } from '../lib/helpers';
import { spec } from '../spec';

export let getPerformanceReviews = SlateTool.create(spec, {
  name: 'Get Performance Reviews',
  key: 'get_performance_reviews',
  description: `Retrieve performance review forms from SAP SuccessFactors. Fetches a specific review by ID or searches reviews with filtering. Returns review form details including status, ratings, review periods, and associated participants.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formDataId: z
        .number()
        .optional()
        .describe('Specific performance review form data ID to retrieve'),
      filter: z
        .string()
        .optional()
        .describe('OData $filter expression (e.g., "formStatus eq \'completed\'")'),
      select: z.string().optional().describe('Comma-separated fields to return'),
      expand: z
        .string()
        .optional()
        .describe(
          'Navigation properties to expand; discover exact tenant names with get_api_metadata'
        ),
      top: z
        .number()
        .optional()
        .describe('Maximum records to return when searching')
        .default(50),
      nextPage: z
        .string()
        .optional()
        .describe(
          'Exact nextLink from the preceding result. Keep the entity and original query unchanged; do not combine with skip.'
        ),
      skip: z.number().optional().describe('Number of records to skip')
    })
  )
  .output(
    z.object({
      review: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Single performance review (when formDataId is provided)'),
      reviews: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of performance reviews (when searching)'),
      nextLink: z
        .string()
        .optional()
        .describe(
          'Exact provider continuation URL; pass it as nextPage to retrieve the next page.'
        ),
      hasMore: z.boolean().optional().describe('Whether SAP returned another page.'),
      totalCount: z.number().optional().describe('Total count of matching records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiServerUrl: ctx.auth.apiServerUrl
    });

    if (ctx.input.formDataId !== undefined) {
      if (
        ctx.input.filter !== undefined ||
        ctx.input.skip !== undefined ||
        ctx.input.nextPage !== undefined ||
        ctx.input.top !== 50
      )
        throw invalid(
          'A keyed read cannot use search filters or pagination. Omit the ID to search.'
        );
      let review = await client.getPerformanceReview(ctx.input.formDataId, {
        select: ctx.input.select,
        expand: ctx.input.expand
      });
      return {
        output: { review },
        message: `Retrieved performance review **#${ctx.input.formDataId}**`
      };
    }

    let result = await client.queryPerformanceReviews({
      filter: ctx.input.filter,
      select: ctx.input.select,
      expand: ctx.input.expand,
      top: ctx.input.top,
      skip: ctx.input.skip,
      nextPage: ctx.input.nextPage,
      inlineCount: true
    });

    return {
      output: {
        reviews: result.results,
        totalCount: result.count,
        nextLink: result.nextLink,
        hasMore: result.hasMore
      },
      message: `Found **${result.results.length}** performance reviews`
    };
  })
  .build();

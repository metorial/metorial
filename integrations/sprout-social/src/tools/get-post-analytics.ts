import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPostAnalytics = SlateTool.create(spec, {
  name: 'Get Post Analytics',
  key: 'get_post_analytics',
  description: `Retrieve post-level analytics data from Sprout Social matching the Post Performance Report. Returns individual published posts with their content, metadata (tags, author, permalink), and lifetime performance metrics such as impressions, reactions, comments, shares, and video views.`,
  instructions: [
    'Profile ID filter format: "customer_profile_id.eq(id1, id2)".',
    'Time filter format: "created_time.in(YYYY-MM-DDTHH:MM:SS..YYYY-MM-DDTHH:MM:SS)".',
    'Metric names use the "lifetime." prefix (e.g., "lifetime.impressions", "lifetime.reactions").',
    'Available fields include: "created_time", "text", "perma_link", "internal.tags.id", "internal.sent_by.id", "internal.sent_by.email", "internal.sent_by.first_name", "internal.sent_by.last_name".'
  ],
  constraints: [
    'Results paginated at 50 posts per page.',
    'Maximum of 10,000 results per query.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      profileIds: z
        .array(z.number())
        .describe('Array of customer_profile_id values to get post analytics for.'),
      startTime: z
        .string()
        .describe('Start time in ISO 8601 format (e.g., "2024-01-01T00:00:00").'),
      endTime: z
        .string()
        .describe('End time in ISO 8601 format (e.g., "2024-01-31T23:59:59").'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Post fields to return (e.g., "created_time", "text", "perma_link").'),
      metrics: z
        .array(z.string())
        .optional()
        .describe(
          'Post metrics to return (e.g., "lifetime.impressions", "lifetime.reactions").'
        ),
      sort: z.array(z.string()).optional().describe('Sort order (e.g., "created_time:desc").'),
      timezone: z.string().optional().describe('IANA timezone (e.g., "America/Chicago").'),
      page: z.number().optional().describe('Page number for pagination (1-indexed).')
    })
  )
  .output(
    z.object({
      posts: z
        .array(z.any())
        .describe('Array of post objects with requested fields and metrics.'),
      paging: z
        .object({
          currentPage: z.number().optional(),
          totalPages: z.number().optional()
        })
        .optional()
        .describe('Pagination information.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId
    });

    let filters = [
      `customer_profile_id.eq(${ctx.input.profileIds.join(', ')})`,
      `created_time.in(${ctx.input.startTime}..${ctx.input.endTime})`
    ];

    let result = await client.getPostAnalytics({
      filters,
      fields: ctx.input.fields,
      metrics: ctx.input.metrics,
      sort: ctx.input.sort,
      timezone: ctx.input.timezone,
      page: ctx.input.page
    });

    let posts = result?.data ?? [];
    let paging = result?.paging
      ? {
          currentPage: result.paging.current_page,
          totalPages: result.paging.total_pages
        }
      : undefined;

    return {
      output: { posts, paging },
      message: `Retrieved **${posts.length}** posts with analytics for ${ctx.input.profileIds.length} profile(s).`
    };
  });

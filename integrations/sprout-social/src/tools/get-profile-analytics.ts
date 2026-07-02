import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProfileAnalytics = SlateTool.create(spec, {
  name: 'Get Profile Analytics',
  key: 'get_profile_analytics',
  description: `Retrieve owned profile analytics data from Sprout Social matching the Profile Performance reports. Returns daily aggregated metrics such as impressions, follower counts, engagement, and video views for profiles across X, Facebook, Threads, Instagram, LinkedIn, Pinterest, YouTube, and TikTok.`,
  instructions: [
    'Provide customer_profile_id values obtained from the Get Metadata tool.',
    'The reporting period filter uses the format: "reporting_period.in(YYYY-MM-DD...YYYY-MM-DD)".',
    'Profile ID filter uses the format: "customer_profile_id.eq(id1, id2, ...)".',
    'Maximum 100 profiles per request and 1 year per reporting period.'
  ],
  constraints: [
    'Maximum of 100 profiles per request.',
    'Maximum reporting period of 1 year.',
    'Some metrics require the Premium Analytics add-on.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      profileIds: z
        .array(z.number())
        .describe('Array of customer_profile_id values to retrieve analytics for.'),
      startDate: z
        .string()
        .describe('Start date for the reporting period in YYYY-MM-DD format.'),
      endDate: z.string().describe('End date for the reporting period in YYYY-MM-DD format.'),
      metrics: z
        .array(z.string())
        .describe(
          'Metrics to retrieve (e.g., "impressions", "reactions", "followers_gained", "engagements", "video_views").'
        ),
      page: z.number().optional().describe('Page number for pagination (1-indexed).')
    })
  )
  .output(
    z.object({
      analyticsData: z
        .array(
          z.object({
            dimensions: z
              .any()
              .describe('Dimension values (profile ID and reporting period).'),
            metrics: z.any().describe('Metric values for the given dimensions.')
          })
        )
        .describe('Array of analytics data points.'),
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
      `reporting_period.in(${ctx.input.startDate}...${ctx.input.endDate})`
    ];

    let result = await client.getProfileAnalytics({
      filters,
      metrics: ctx.input.metrics,
      page: ctx.input.page
    });

    let analyticsData = (result?.data ?? []).map((item: any) => ({
      dimensions: item.dimensions,
      metrics: item.metrics
    }));

    let paging = result?.paging
      ? {
          currentPage: result.paging.current_page,
          totalPages: result.paging.total_pages
        }
      : undefined;

    return {
      output: { analyticsData, paging },
      message: `Retrieved **${analyticsData.length}** profile analytics data points for ${ctx.input.profileIds.length} profile(s) from ${ctx.input.startDate} to ${ctx.input.endDate}.`
    };
  });

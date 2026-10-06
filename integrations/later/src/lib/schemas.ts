import { z } from 'zod';
export const pageInput = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Page size, 1–100. Keep it unchanged when continuing a cursor.'),
  nextCursor: z
    .string()
    .min(1)
    .optional()
    .describe('Opaque cursor from the previous page. Keep all filters and sorting unchanged.')
};
export const cursorSchema = z.string().nullable();
export const campaignSchema = z.object({
  campaignId: z.number().int(),
  campaignName: z.string().nullable(),
  instanceId: z.string(),
  status: z.string().nullable(),
  startDate: z.string().nullable(),
  description: z.string().nullable(),
  firstPostDate: z.string().nullable(),
  lastPostDate: z.string().nullable()
});
export const metricsSchema = z.record(z.string(), z.number().nullable());
export const analyticsItemSchema = z.object({
  metrics: metricsSchema,
  instanceId: z.string().optional(),
  campaignId: z.number().int().optional(),
  campaignName: z.string().nullable().optional(),
  creatorId: z.number().int().nullable().optional(),
  creatorName: z.string().nullable().optional(),
  postId: z.number().int().optional(),
  contentType: z.string().nullable().optional(),
  postDate: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});
export const analyticsInputSchema = z.object({
  level: z
    .enum([
      'instance_summary',
      'instance_timeseries',
      'campaign',
      'creator',
      'platform',
      'platform_roi',
      'post'
    ])
    .describe('Reporting level. ROI returns its fixed metric set; summary does not paginate.'),
  startDate: z.string().describe('First date in UTC, YYYY-MM-DD.'),
  endDate: z
    .string()
    .describe('Last date in UTC, YYYY-MM-DD; at most two years after startDate.'),
  metrics: z
    .array(z.string().min(1))
    .min(1)
    .optional()
    .describe(
      'Required except for platform_roi, where metrics must be omitted. Accepted metric names differ by level and platform; see the current Reporting API reference.'
    ),
  instanceIds: z
    .array(z.string().min(1))
    .min(1)
    .optional()
    .describe(
      'Authorized instance IDs from list_instances; omitted means all instances assigned to these credentials.'
    ),
  campaignIds: z
    .array(z.number().int().positive())
    .min(1)
    .max(50)
    .optional()
    .describe('Numeric campaign IDs from list_campaigns_v2; at most 50.'),
  platform: z
    .array(
      z.enum([
        'instagram',
        'tiktok',
        'facebook',
        'youtube',
        'twitter',
        'linkedin',
        'pinterest',
        'snapchat',
        'blog',
        'twitch'
      ])
    )
    .min(1)
    .optional()
    .describe('Platform filter; mutually exclusive with contentType.'),
  contentType: z
    .array(
      z.enum([
        'instagram_post',
        'instagram_reel',
        'instagram_story',
        'facebook_post',
        'facebook_live',
        'facebook_group',
        'facebook_reel',
        'tiktok',
        'youtube_video',
        'youtube_shorts',
        'twitter',
        'linkedin',
        'pinterest',
        'snapchat_story',
        'blog',
        'twitch_stream'
      ])
    )
    .min(1)
    .optional()
    .describe('Content format filter; mutually exclusive with platform.'),
  dateBasis: z
    .enum(['post_date', 'performance_date'])
    .optional()
    .describe('Filter by publication date or recorded performance date.'),
  granularity: z
    .enum(['year', 'quarter', 'month', 'week', 'day'])
    .optional()
    .describe(
      'Only instance_timeseries. Weeks use ISO Monday–Sunday buckets; missing buckets are omitted.'
    ),
  sortProperty: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Only campaign, creator, platform or post. Use a metric supported by that route, or its documented date-sort field.'
    ),
  sortDirection: z
    .enum(['ASC', 'DESC'])
    .optional()
    .describe('Only campaign, creator, platform or post.'),
  ...pageInput
});
export type AnalyticsInput = z.infer<typeof analyticsInputSchema>;

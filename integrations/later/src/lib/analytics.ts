import { invalid } from './errors';
import type { AnalyticsInput } from './schemas';

const names = (value: string) => value.split(',');
export const analyticsRoutes = {
  instance_summary: '/instances/performance',
  instance_timeseries: '/instances/performance-over-time',
  campaign: '/campaigns/performance',
  creator: '/creators/performance',
  platform: '/platforms/performance',
  platform_roi: '/platforms/return-on-investment',
  post: '/posts/performance'
};
export const metricNames = {
  instance_summary: names(
    'engagements,impressions,engagementRate,postsCount,reach,organicReach,views,estimatedValueGenerated,estimatedContentCost,campaignsCost,returnOnInvestment,cpe,cpm,paidEngagements,paidImpressions,paidEngagementRate,paidPostsCount,paidReach,paidViews,paidAdSpend,paidReturnOnAdSpend,paidCpe,paidCpm,trackingLinksClicks,trackingLinksConversions,trackingLinksConversionValue,affiliateLinksClicks,affiliateLinksConversions,affiliateLinksSales'
  ),
  instance_timeseries: names(
    'likes,comments,shares,clicks,impressions,reach,organicReach,engagements,views,engagementRate,postsCount,estimatedValueGenerated,cpe,cpm,paidLikes,paidComments,paidShares,paidImpressions,paidEngagements,paidEngagementRate,paidReach,paidViews'
  ),
  campaign: names(
    'likes,comments,shares,clicks,saves,impressions,reach,organicReach,engagements,views,totalInteractions,replies,reposts,potentialReach,videoViewTotalTime,crosspostedViews,crosspostedFacebookOnlyViews,engagementRate,postsCount,influencersCount,impressionsPerPost,estimatedValueGenerated,estimatedContentCost,estimatedRoi,cpe,cpm,paidLikes,paidComments,paidShares,paidClicks,paidImpressions,paidEngagements,paidEngagementRate,paidViews,paidReach,paidSaves,paidCpe,paidCpm,paidPostsCount,paidInfluencersCount,paidAdSpend,paidReturnOnAdSpend,paidInitialPlays,paidCost,trackingLinksClicks,trackingLinksConversions,trackingLinksConversionValue,affiliateLinksClicks,affiliateLinksConversions,affiliateLinksConversionRate,affiliateLinksSales,affiliateLinksCommissionEarned,affiliateLinksRoi'
  ),
  creator: names(
    'likes,comments,shares,saves,impressions,reach,organicReach,engagements,views,totalInteractions,replies,reposts,potentialReach,videoViewTotalTime,avgWatchTime,navigationTapExit,navigationTapBack,navigationTapForward,navigationSwipeForward,crosspostedViews,crosspostedFacebookOnlyViews,engagementRate,postsCount,estimatedValueGenerated,estimatedContentCost,estimatedRoi,cpe,cpm,paidLikes,paidComments,paidShares,paidImpressions,paidEngagements,paidEngagementRate,paidViews,paidReach,paidSaves,paidCpe,paidCpm,paidPostsCount,paidCost,trackingLinksClicks,trackingLinksConversions,trackingLinksConversionValue,affiliateLinksClicks,affiliateLinksConversions,affiliateLinksConversionRate,affiliateLinksSales,affiliateLinksCommissionEarned,affiliateLinksRoi'
  ),
  platform: names(
    'likes,comments,shares,saves,impressions,reach,organicReach,engagements,views,totalInteractions,replies,reposts,potentialReach,videoViewTotalTime,avgWatchTime,navigationTapExit,navigationTapBack,navigationTapForward,navigationSwipeForward,crosspostedViews,crosspostedFacebookOnlyViews,engagementRate,postsCount,impressionsPerPost,engagementsPerPost,estimatedValueGenerated,cpe,cpm,paidLikes,paidComments,paidShares,paidImpressions,paidEngagements,paidEngagementRate,paidViews,paidReach,paidSaves,paidCpe,paidCpm,paidPostsCount,paidAdSpend,paidReturnOnAdSpend'
  ),
  post: names(
    'likes,comments,shares,saves,impressions,reach,organicReach,engagements,views,totalInteractions,replies,reposts,potentialReach,followersAtPostDate,videoViewTotalTime,avgWatchTime,navigationTapExit,navigationTapBack,navigationTapForward,navigationSwipeForward,crosspostedViews,crosspostedFacebookOnlyViews,engagementRate,estimatedValueGenerated,cpe,cpm,paidLikes,paidComments,paidShares,paidImpressions,paidEngagements,paidEngagementRate,paidViews,paidReach,paidSaves,paidCpe,paidCpm'
  ),
  platform_roi: names(
    'estimatedContentCost,returnOnInvestment,valueGenerated,valueOfComments,valueOfImpressions,valueOfLikes,valueOfShares'
  )
};
export const date = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw invalid('Dates must use YYYY-MM-DD.');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)
    throw invalid('A reporting date is not a valid calendar date.');
  return parsed;
};
export const dates = (start?: string, end?: string, bounded = false) => {
  const first = start === undefined ? undefined : date(start),
    last = end === undefined ? undefined : date(end);
  if (first && last) {
    if (last < first) throw invalid('endDate must be on or after startDate.');
    if (bounded) {
      const maximum = new Date(first);
      maximum.setUTCFullYear(maximum.getUTCFullYear() + 2);
      if (last > maximum) throw invalid('The reporting range cannot exceed two years.');
    }
  }
};
export const validateAnalytics = (input: AnalyticsInput) => {
  dates(input.startDate, input.endDate, true);
  if (input.platform && input.contentType)
    throw invalid('Provide platform or contentType, not both.');
  if (input.level === 'platform_roi') {
    if (input.metrics !== undefined)
      throw invalid('platform_roi has a fixed metric set; omit metrics.');
  } else {
    if (!input.metrics?.length) throw invalid('metrics is required for this reporting level.');
    if (input.metrics.some(value => !metricNames[input.level].includes(value)))
      throw invalid(
        'A metric is unsupported for this reporting level. Consult the current Reporting API reference.'
      );
  }
  if (input.instanceIds?.some(value => !value.trim() || /[,\r\n]/.test(value)))
    throw invalid('instanceIds must contain nonempty individual identifiers.');
  if (
    input.level === 'instance_summary' &&
    (input.limit !== undefined || input.nextCursor !== undefined)
  )
    throw invalid('instance_summary does not paginate; omit limit and nextCursor.');
  if (input.granularity !== undefined && input.level !== 'instance_timeseries')
    throw invalid('granularity is only supported for instance_timeseries.');
  if (input.sortProperty !== undefined || input.sortDirection !== undefined) {
    if (!['campaign', 'creator', 'platform', 'post'].includes(input.level))
      throw invalid('Sorting is only supported for campaign, creator, platform and post.');
    const allowed = [
      ...metricNames[input.level],
      ...(input.level === 'campaign'
        ? ['firstPostDate', 'lastPostDate']
        : input.level === 'post'
          ? ['postDate']
          : [])
    ];
    if (input.sortProperty !== undefined && !allowed.includes(input.sortProperty))
      throw invalid('sortProperty is unsupported for this reporting level.');
  }
};

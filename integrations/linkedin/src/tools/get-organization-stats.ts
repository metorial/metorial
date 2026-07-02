import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinkedInClient } from '../lib/client';
import { spec } from '../spec';

export let getOrganizationStats = SlateTool.create(spec, {
  name: 'Get Organization Statistics',
  key: 'get_organization_stats',
  description: `Retrieve follower and page view statistics for a LinkedIn organization (company page). Includes follower demographics breakdowns by seniority, industry, function, region, and staff count range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationUrn: z
        .string()
        .describe('URN of the organization, e.g. "urn:li:organization:12345"')
    })
  )
  .output(
    z.object({
      followerStats: z
        .object({
          byAssociationType: z
            .any()
            .optional()
            .describe('Follower counts by association type (organic vs paid)'),
          byRegion: z.any().optional().describe('Follower counts by geographic region'),
          bySeniority: z.any().optional().describe('Follower counts by seniority level'),
          byIndustry: z.any().optional().describe('Follower counts by industry'),
          byFunction: z.any().optional().describe('Follower counts by job function'),
          byStaffCountRange: z.any().optional().describe('Follower counts by company size')
        })
        .describe('Follower demographics and breakdowns'),
      pageStats: z
        .object({
          totalViews: z.number().optional().describe('Total all-device page views'),
          mobileViews: z.number().optional().describe('Mobile-specific page views')
        })
        .optional()
        .describe('Page view statistics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinkedInClient({ token: ctx.auth.token });

    let [followerStats, pageStats] = await Promise.all([
      client.getOrganizationFollowerStatistics(ctx.input.organizationUrn),
      client.getOrganizationPageStatistics(ctx.input.organizationUrn)
    ]);

    return {
      output: {
        followerStats: {
          byAssociationType: followerStats.followerCountsByAssociationType,
          byRegion: followerStats.followerCountsByRegion,
          bySeniority: followerStats.followerCountsBySeniority,
          byIndustry: followerStats.followerCountsByIndustry,
          byFunction: followerStats.followerCountsByFunction,
          byStaffCountRange: followerStats.followerCountsByStaffCountRange
        },
        pageStats: pageStats.totalPageStatistics
          ? {
              totalViews: pageStats.totalPageStatistics.views?.allPageViews?.pageViews,
              mobileViews: pageStats.totalPageStatistics.views?.mobilePageViews?.pageViews
            }
          : undefined
      },
      message: `Retrieved statistics for organization \`${ctx.input.organizationUrn}\`.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getSiteInfoTool = SlateTool.create(spec, {
  name: 'Get Site Info',
  key: 'get_site_info',
  description: `Retrieve general site information including title, description, URL, and other metadata. Useful for verifying site configuration and connectivity.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      siteName: z.string().describe('Site title'),
      siteDescription: z.string().describe('Site tagline/description'),
      siteUrl: z.string().describe('Site URL'),
      homeUrl: z.string().describe('Home page URL'),
      language: z.string().describe('Site language code'),
      timezone: z.string().describe('Site timezone')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let info = await client.getSiteInfo();

    let result: any;
    if (ctx.config.apiType === 'wpcom') {
      result = {
        siteName: info.name || '',
        siteDescription: info.description || '',
        siteUrl: info.URL || '',
        homeUrl: info.URL || '',
        language: info.lang || '',
        timezone: info.options?.timezone || ''
      };
    } else {
      result = {
        siteName: info.name || '',
        siteDescription: info.description || '',
        siteUrl: info.url || '',
        homeUrl: info.home || info.url || '',
        language: info.language || '',
        timezone: info.timezone_string || info.gmt_offset || ''
      };
    }

    return {
      output: result,
      message: `Site: **${result.siteName}** — ${result.siteDescription}\nURL: ${result.siteUrl}`
    };
  })
  .build();

export let getSiteStatsTool = SlateTool.create(spec, {
  name: 'Get Site Stats',
  key: 'get_site_stats',
  description: `Retrieve site traffic statistics including page views, visitors, and top posts. **Only available for WordPress.com sites and Jetpack-connected self-hosted sites.**`,
  constraints: ['Only works with WordPress.com sites or Jetpack-connected self-hosted sites'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeTopPosts: z
        .boolean()
        .optional()
        .describe('Include top posts in the response (default: false)'),
      period: z
        .enum(['day', 'week', 'month', 'year'])
        .optional()
        .describe('Time period for top posts (default: "day")'),
      topPostsCount: z
        .number()
        .optional()
        .describe('Number of top posts to include (default: 10)')
    })
  )
  .output(
    z.object({
      viewsToday: z.number().describe('Page views today'),
      visitorsToday: z.number().describe('Unique visitors today'),
      viewsYesterday: z.number().describe('Page views yesterday'),
      visitorsYesterday: z.number().describe('Unique visitors yesterday'),
      viewsBestDay: z.string().describe('Date of the highest traffic day'),
      viewsBestDayTotal: z.number().describe('Total views on the best day'),
      topPosts: z
        .array(
          z.object({
            postId: z.string().describe('Post ID'),
            title: z.string().describe('Post title'),
            url: z.string().describe('Post URL'),
            views: z.number().describe('View count')
          })
        )
        .optional()
        .describe('Most viewed posts in the period')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let stats = await client.getSiteStats();

    let result: any = {
      viewsToday: stats.stats?.views_today || 0,
      visitorsToday: stats.stats?.visitors_today || 0,
      viewsYesterday: stats.stats?.views_yesterday || 0,
      visitorsYesterday: stats.stats?.visitors_yesterday || 0,
      viewsBestDay: stats.stats?.views_best_day || '',
      viewsBestDayTotal: stats.stats?.views_best_day_total || 0
    };

    if (ctx.input.includeTopPosts) {
      let topPostsData = await client.getStatsTopPosts({
        period: ctx.input.period || 'day',
        num: ctx.input.topPostsCount || 10
      });

      let days = topPostsData?.days || {};
      let latestDay = Object.keys(days).sort().reverse()[0];
      let topPosts: any[] = latestDay ? days[latestDay]?.postviews || [] : [];

      result.topPosts = topPosts.map((p: any) => ({
        postId: String(p.id || ''),
        title: p.title || '',
        url: p.href || '',
        views: p.views || 0
      }));
    }

    return {
      output: result,
      message: `**Today**: ${result.viewsToday} views, ${result.visitorsToday} visitors\n**Yesterday**: ${result.viewsYesterday} views, ${result.visitorsYesterday} visitors\n**Best day**: ${result.viewsBestDay} (${result.viewsBestDayTotal} views)`
    };
  })
  .build();

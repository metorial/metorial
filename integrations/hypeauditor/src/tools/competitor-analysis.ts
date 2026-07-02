import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let competitorAnalysis = SlateTool.create(spec, {
  name: 'Instagram Competitor Analysis',
  key: 'competitor_analysis',
  description: `Analyze competitor Instagram Share of Voice. Create a new analysis report, check its status, retrieve results, or list posts from a completed report. Reports track mentions frequency, collaborating influencers, and content engagement within a date range.`,
  instructions: [
    'Use action "create" to start a new competitor analysis report. Reports are generated asynchronously.',
    'Use action "get" to check report status and retrieve results. State 0 = calculating, state 10 = ready.',
    'Use action "get_posts" to list individual posts from a completed analysis.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'get_posts']).describe('Operation to perform'),
      // For create
      username: z
        .string()
        .optional()
        .describe('Instagram username to analyze (required for create)'),
      dateFrom: z
        .string()
        .optional()
        .describe('Start date in YYYY-MM-DD format (required for create)'),
      dateTo: z
        .string()
        .optional()
        .describe('End date in YYYY-MM-DD format (required for create)'),
      audienceGeo: z
        .array(z.string())
        .optional()
        .describe('ISO country codes for audience geography filter (e.g., ["us", "gb"])'),
      hashtags: z
        .array(z.string())
        .optional()
        .describe('Hashtags to track (e.g., ["#nike", "#justdoit"])'),
      // For get and get_posts
      reportId: z.string().optional().describe('Report ID (required for get and get_posts)'),
      // For get_posts pagination
      page: z.number().optional().describe('Page number for posts pagination'),
      pageSize: z.number().optional().describe('Number of posts per page')
    })
  )
  .output(
    z.object({
      report: z
        .any()
        .optional()
        .describe(
          'Report data including EMV, reach, contributors, mentions, and content analysis'
        ),
      posts: z
        .array(z.any())
        .optional()
        .describe('Array of posts from the competitor analysis'),
      reportId: z
        .string()
        .optional()
        .describe('Report ID for tracking async report generation'),
      state: z.number().optional().describe('Report state: 0 = calculating, 10 = ready')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      apiVersion: ctx.config.apiVersion
    });

    let { action } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.username) throw new Error('username is required for create action');
        if (!ctx.input.dateFrom) throw new Error('dateFrom is required for create action');
        if (!ctx.input.dateTo) throw new Error('dateTo is required for create action');

        let response = await client.createCompetitorAnalysis({
          username: ctx.input.username,
          dateFrom: ctx.input.dateFrom,
          dateTo: ctx.input.dateTo,
          audienceGeo: ctx.input.audienceGeo,
          hashtags: ctx.input.hashtags
        });

        let reportData = response?.report?.basic;

        return {
          output: {
            report: response?.report,
            reportId: reportData?.report_id,
            state: reportData?.state
          },
          message: `Competitor analysis report created for **${ctx.input.username}** (report ID: ${reportData?.report_id}). State: ${reportData?.state === 10 ? 'ready' : 'calculating'}.`
        };
      }

      case 'get': {
        if (!ctx.input.reportId) throw new Error('reportId is required for get action');

        let response = await client.getCompetitorAnalysis(ctx.input.reportId);

        return {
          output: {
            report: response,
            reportId: ctx.input.reportId,
            state: response?.report?.basic?.state ?? response?.state
          },
          message: `Retrieved competitor analysis report **${ctx.input.reportId}**.`
        };
      }

      case 'get_posts': {
        if (!ctx.input.reportId) throw new Error('reportId is required for get_posts action');

        let response = await client.getCompetitorAnalysisPosts(
          ctx.input.reportId,
          ctx.input.page,
          ctx.input.pageSize
        );

        let posts = response?.result ?? response ?? [];

        return {
          output: {
            posts: Array.isArray(posts) ? posts : [],
            reportId: ctx.input.reportId
          },
          message: `Retrieved posts from competitor analysis report **${ctx.input.reportId}**.`
        };
      }
    }
  })
  .build();

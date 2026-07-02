import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getKeywordRankings = SlateTool.create(spec, {
  name: 'Get Keyword Rankings',
  key: 'get_keyword_rankings',
  description: `Retrieve detailed ranking data for a specific keyword or ranking history for multiple keywords. Use with a single keyword to get full details including SERP features and search intent, or with multiple keyword IDs to get historical ranking charts.`,
  instructions: [
    'For a single keyword detail view, provide projectName and keywordId.',
    'For ranking history charts, provide keywordIds (array) with an optional historyDays limit.',
    'The date parameter (YYYY-MM-DD) can be used to get a single-day snapshot for a specific keyword.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectName: z
        .string()
        .optional()
        .describe('Project name (required for single keyword lookup)'),
      keywordId: z.string().optional().describe('Keyword ID for detailed single-keyword data'),
      date: z.string().optional().describe('Specific date for ranking snapshot (YYYY-MM-DD)'),
      keywordIds: z
        .array(z.string())
        .optional()
        .describe('Array of keyword IDs for ranking history chart'),
      historyDays: z
        .number()
        .optional()
        .describe('Number of days of history to retrieve (max 180)')
    })
  )
  .output(
    z.object({
      keyword: z
        .object({
          keywordId: z.string().nullable().describe('Keyword identifier'),
          keyword: z.string().nullable().describe('Keyword text'),
          currentRank: z.number().nullable().describe('Current ranking position'),
          bestRank: z.number().nullable().describe('Best ever ranking position'),
          url: z.string().nullable().describe('Tracked URL'),
          rankingUrl: z.string().nullable().describe('URL currently ranking'),
          searchVolume: z.number().nullable().describe('Monthly search volume'),
          cpc: z.number().nullable().describe('Cost per click'),
          competition: z.number().nullable().describe('Competition score'),
          serpFeatures: z.any().nullable().describe('SERP features data'),
          rankHistory: z.any().nullable().describe('Historical ranking positions'),
          trends: z.any().nullable().describe('Ranking movement trends')
        })
        .nullable()
        .describe('Single keyword detail (when using keywordId)'),
      rankingHistory: z
        .any()
        .nullable()
        .describe('Ranking history chart data (when using keywordIds)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.keywordIds && ctx.input.keywordIds.length > 0) {
      let history = await client.getRankingHistory({
        keywordIds: ctx.input.keywordIds,
        limit: ctx.input.historyDays
      });

      return {
        output: {
          keyword: null,
          rankingHistory: history
        },
        message: `Retrieved ranking history for **${ctx.input.keywordIds.length}** keyword(s).`
      };
    }

    if (ctx.input.projectName && ctx.input.keywordId) {
      let data = await client.getKeyword({
        projectName: ctx.input.projectName,
        keywordId: ctx.input.keywordId,
        date: ctx.input.date
      });

      let kw = data?.keyword ?? data;

      return {
        output: {
          keyword: {
            keywordId: kw.id ? String(kw.id) : null,
            keyword: kw.kw ?? kw.keyword ?? null,
            currentRank: kw.grank ?? kw.rank ?? null,
            bestRank: kw.best ?? null,
            url: kw.url ?? null,
            rankingUrl: kw.rankingurl ?? null,
            searchVolume: kw.ms ?? null,
            cpc: kw.cpc ?? null,
            competition: kw.competition ?? null,
            serpFeatures: kw.serp_features ?? null,
            rankHistory: kw.grank_history ?? null,
            trends: kw.trends ?? null
          },
          rankingHistory: null
        },
        message:
          kw.grank != null
            ? `Keyword **"${kw.kw ?? kw.keyword}"** is ranked **#${kw.grank}** (best: #${kw.best ?? 'N/A'}).`
            : `Retrieved details for keyword **"${kw.kw ?? kw.keyword}"**.`
      };
    }

    throw new Error(
      'Provide either projectName + keywordId for a single keyword, or keywordIds for ranking history.'
    );
  })
  .build();

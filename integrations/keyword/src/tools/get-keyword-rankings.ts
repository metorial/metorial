import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  getAttributes,
  getResource,
  keywordRank,
  nullableNumber,
  requireRecord
} from '../lib/response';
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
          currentRank: z
            .number()
            .nullable()
            .describe(
              'Numeric ranking position; null when unavailable or out of range. See rawResponse for the original state.'
            ),
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
        .describe('Ranking history chart data (when using keywordIds)'),
      rawResponse: z.any().describe('Original keyword or ranking history response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.keywordIds && ctx.input.keywordIds.length > 0) {
      let history = await client.getRankingHistory({
        keywordIds: ctx.input.keywordIds,
        limit: ctx.input.historyDays
      });

      requireRecord(history, 'ranking history');
      return {
        output: {
          keyword: null,
          rankingHistory: history,
          rawResponse: history
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

      let resource = getResource(data, 'keyword');
      let kw = getAttributes(resource);

      return {
        output: {
          keyword: {
            keywordId: resource.id == null ? null : String(resource.id),
            keyword: kw.kw ?? kw.keyword ?? null,
            currentRank: keywordRank(kw.grank ?? kw.rank),
            bestRank: nullableNumber(kw.best, 'best rank'),
            url: kw.url ?? null,
            rankingUrl: kw.rankingurl ?? null,
            searchVolume: nullableNumber(kw.ms ?? kw.search_volume, 'search volume'),
            cpc: nullableNumber(kw.cpc, 'cost per click'),
            competition: nullableNumber(kw.competition, 'competition'),
            serpFeatures: kw.serp_features ?? null,
            rankHistory: kw.grankhistory ?? kw.grank_history ?? null,
            trends: kw.trends ?? null
          },
          rankingHistory: null,
          rawResponse: data
        },
        message: `Retrieved keyword details for **${ctx.input.keywordId}**.`
      };
    }

    throw createApiServiceError(
      'Provide either projectName + keywordId for a single keyword, or keywordIds for ranking history.'
    );
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { SemrushAnalyticsClient } from '../lib/client';
import { transformResults } from '../lib/csv-parser';
import { spec } from '../spec';

export let researchKeyword = SlateTool.create(spec, {
  name: 'Research Keyword',
  key: 'research_keyword',
  description: `Get comprehensive data for one or more keywords including search volume, CPC, competition level, keyword difficulty, SERP features, and number of results.
Also supports fetching related keywords, broad match keywords, question-based keywords, and organic SERP results for deeper keyword research.`,
  instructions: [
    'Pass a single keyword or multiple keywords (up to 100) for batch analysis.',
    'Use reportType to select additional data beyond the standard overview.',
    'Combine multiple report types by calling this tool multiple times with different reportType values.'
  ],
  constraints: [
    'Batch mode (multiple keywords) only returns overview data, not related/broad match/questions.',
    'Maximum 100 keywords in batch mode.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      keywords: z
        .union([
          z.string().describe('A single keyword to research'),
          z.array(z.string()).max(100).describe('Multiple keywords for batch overview')
        ])
        .describe('One or more keywords to research'),
      reportType: z
        .enum([
          'overview',
          'organic_results',
          'related',
          'broad_match',
          'questions',
          'difficulty'
        ])
        .default('overview')
        .describe('Type of keyword report to generate'),
      database: z.string().optional().describe('Regional database code (e.g., us, uk, de)'),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe('Maximum number of results for related/broad/questions reports'),
      offset: z.number().optional().describe('Number of results to skip for pagination'),
      sortBy: z
        .string()
        .optional()
        .describe('Sort field and order (e.g., "nq_desc" for volume descending)'),
      filter: z
        .string()
        .optional()
        .describe('Filter expression for related/broad/questions reports')
    })
  )
  .output(
    z.object({
      keywords: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Keyword data matching the requested report type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SemrushAnalyticsClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      database: ctx.config.database
    });

    let db = ctx.input.database || ctx.config.database;
    let results: Record<string, unknown>[];
    let isBatch = Array.isArray(ctx.input.keywords);
    let phrase = isBatch ? '' : (ctx.input.keywords as string);

    switch (ctx.input.reportType) {
      case 'overview':
        if (isBatch) {
          results = await client.getKeywordOverviewBatch({
            phrases: ctx.input.keywords as string[],
            database: db
          });
        } else {
          results = await client.getKeywordOverview({
            phrase,
            database: db
          });
        }
        break;

      case 'organic_results':
        if (isBatch) throw new Error('Organic results report only supports a single keyword.');
        results = await client.getKeywordOrganicResults({
          phrase,
          database: db,
          displayLimit: ctx.input.limit,
          displayOffset: ctx.input.offset
        });
        break;

      case 'related':
        if (isBatch)
          throw new Error('Related keywords report only supports a single keyword.');
        results = await client.getRelatedKeywords({
          phrase,
          database: db,
          displayLimit: ctx.input.limit,
          displayOffset: ctx.input.offset,
          displaySort: ctx.input.sortBy,
          displayFilter: ctx.input.filter
        });
        break;

      case 'broad_match':
        if (isBatch) throw new Error('Broad match report only supports a single keyword.');
        results = await client.getBroadMatchKeywords({
          phrase,
          database: db,
          displayLimit: ctx.input.limit,
          displayOffset: ctx.input.offset,
          displaySort: ctx.input.sortBy,
          displayFilter: ctx.input.filter
        });
        break;

      case 'questions':
        if (isBatch) throw new Error('Questions report only supports a single keyword.');
        results = await client.getPhraseQuestions({
          phrase,
          database: db,
          displayLimit: ctx.input.limit,
          displayOffset: ctx.input.offset,
          displaySort: ctx.input.sortBy,
          displayFilter: ctx.input.filter
        });
        break;

      case 'difficulty':
        if (isBatch) throw new Error('Difficulty report only supports a single keyword.');
        results = await client.getKeywordDifficulty({
          phrase,
          database: db
        });
        break;

      default:
        throw new Error(`Unknown report type: ${ctx.input.reportType}`);
    }

    let keywords = transformResults(results);

    let label = isBatch
      ? `${(ctx.input.keywords as string[]).length} keywords`
      : `"${phrase}"`;

    return {
      output: {
        keywords
      },
      message: `Retrieved ${ctx.input.reportType} data for ${label}: ${keywords.length} results (database: ${db}).`
    };
  })
  .build();

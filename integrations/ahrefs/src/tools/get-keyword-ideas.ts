import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getKeywordIdeas = SlateTool.create(spec, {
  name: 'Get Keyword Ideas',
  key: 'get_keyword_ideas',
  description: `Discover keyword ideas based on a seed keyword. Returns matching terms (phrases containing the keyword) or related terms (semantically related keywords).
Also supports fetching search volume history and volume by country for deeper analysis. Use to expand keyword lists and find new ranking opportunities.`,
  instructions: [
    'Set "ideaType" to "matching" for phrases containing the keyword, or "related" for semantically related terms.',
    'Use "volume-by-country" to see how search volume varies across countries.',
    'Use "volume-history" to see search volume trends over time.'
  ],
  constraints: [
    'Consumes API units (minimum 50 per request).',
    'Rate limited to 60 requests per minute.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().describe('Seed keyword to generate ideas from'),
      ideaType: z
        .enum(['matching', 'related', 'volume-by-country', 'volume-history'])
        .optional()
        .describe('Type of keyword ideas to retrieve. Defaults to "matching".'),
      country: z
        .string()
        .optional()
        .describe(
          'Two-letter country code. Defaults to "us". Not applicable for volume-by-country.'
        ),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      where: z
        .string()
        .optional()
        .describe('Filter expression in Ahrefs filter syntax (JSON string)'),
      orderBy: z.string().optional().describe('Sort order, e.g., "volume:desc"'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      keywordIdeas: z.any().describe('List of keyword ideas or volume data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let ideaType = ctx.input.ideaType || 'matching';

    let result: any;
    switch (ideaType) {
      case 'related':
        result = await client.getRelatedTerms({
          keyword: ctx.input.keyword,
          country: ctx.input.country,
          select: ctx.input.select,
          where: ctx.input.where,
          order_by: ctx.input.orderBy,
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });
        break;
      case 'volume-by-country':
        result = await client.getVolumeByCountry({
          keyword: ctx.input.keyword,
          select: ctx.input.select
        });
        break;
      case 'volume-history':
        result = await client.getVolumeHistory({
          keyword: ctx.input.keyword,
          country: ctx.input.country,
          select: ctx.input.select
        });
        break;
      default:
        result = await client.getMatchingTerms({
          keyword: ctx.input.keyword,
          country: ctx.input.country,
          select: ctx.input.select,
          where: ctx.input.where,
          order_by: ctx.input.orderBy,
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });
    }

    return {
      output: {
        keywordIdeas: result
      },
      message: `Retrieved ${ideaType} keyword ideas for **${ctx.input.keyword}**.`
    };
  })
  .build();

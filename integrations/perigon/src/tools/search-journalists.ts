import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerigonClient } from '../lib/client';
import { formatJournalist } from '../lib/responses';
import { spec } from '../spec';

let journalistSchema = z
  .object({
    journalistId: z.string().describe('Unique journalist identifier (UUID)'),
    name: z.string().describe('Journalist name'),
    title: z.string().describe('Professional title'),
    bio: z.string().describe('Biography'),
    twitterHandle: z.string().describe('Twitter/X handle'),
    location: z.string().describe('Location'),
    avgMonthlyPosts: z.number().describe('Average number of articles per month'),
    topSources: z
      .array(
        z
          .object({
            name: z.string(),
            domain: z.string(),
            count: z.number()
          })
          .partial()
      )
      .describe('Most frequent publications'),
    topCategories: z
      .array(
        z
          .object({
            name: z.string(),
            count: z.number()
          })
          .partial()
      )
      .describe('Most covered categories'),
    topTopics: z
      .array(
        z
          .object({
            name: z.string(),
            count: z.number()
          })
          .partial()
      )
      .describe('Most covered topics'),
    topCountries: z
      .array(
        z
          .object({
            name: z.string(),
            count: z.number()
          })
          .partial()
      )
      .describe('Most covered countries')
  })
  .partial();

export let searchJournalists = SlateTool.create(spec, {
  name: 'Search Journalists',
  key: 'search_journalists',
  description: `Search Perigon's database of 230,000+ journalist and reporter profiles. Returns journalist details including bio, publications, coverage areas, and publishing activity. Use this to find journalists covering specific topics or writing for specific publications.`,
  instructions: ['The journalistId can be found in article responses under matchedAuthors'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search journalist names, titles, and Twitter biographies'),
      source: z
        .string()
        .optional()
        .describe('Filter by publisher domain, such as reuters.com'),
      topic: z.string().optional().describe('Filter by a frequently covered topic'),
      category: z.string().optional().describe('Filter by a frequently covered category'),
      country: z.string().optional().describe('Filter by countries commonly covered'),
      minMonthlyPosts: z
        .number()
        .optional()
        .describe('Minimum average monthly publishing volume'),
      name: z.string().optional().describe('Journalist name to search'),
      journalistId: z
        .string()
        .optional()
        .describe('Look up a specific journalist by their UUID (from article matchedAuthors)'),
      page: z.number().optional().describe('Page number (zero-based)'),
      size: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.unknown())
        .describe('Complete provider response, including unavailable enrichment values'),
      numResults: z.number().describe('Total number of matching journalists'),
      journalists: z.array(journalistSchema).describe('List of matching journalists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerigonClient(ctx.auth.token);

    if (ctx.input.journalistId !== undefined) {
      let detail = await client.getJournalistById(ctx.input.journalistId);
      let journalist = formatJournalist(detail);

      return {
        output: {
          raw: detail,
          numResults: 1,
          journalists: [journalist]
        },
        message: 'Retrieved the requested journalist profile.'
      };
    }

    let result = await client.searchJournalists({
      q: ctx.input.query,
      source: ctx.input.source,
      topic: ctx.input.topic,
      category: ctx.input.category,
      country: ctx.input.country,
      minMonthlyPosts: ctx.input.minMonthlyPosts,
      name: ctx.input.name,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let journalists = result.results.map(formatJournalist);

    return {
      output: {
        raw: result,
        numResults: result.numResults,
        journalists
      },
      message: `Found **${result.numResults}** journalists (showing ${journalists.length}).`
    };
  })
  .build();

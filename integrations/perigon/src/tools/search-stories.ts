import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerigonClient } from '../lib/client';
import { formatStory } from '../lib/responses';
import { spec } from '../spec';

let storySchema = z
  .object({
    storyId: z.string().describe('Unique story cluster ID'),
    name: z.string().describe('AI-generated story name'),
    summary: z.string().describe('AI-generated story summary'),
    description: z.string().describe('AI-generated story description'),
    createdAt: z.string().describe('When the story was first detected (ISO 8601)'),
    updatedAt: z.string().describe('When the story was last updated (ISO 8601)'),
    uniqueCount: z.number().describe('Number of unique articles in this story'),
    reprintCount: z.number().describe('Number of reprints/duplicates'),
    totalCount: z.number().describe('Total article count including reprints'),
    categories: z
      .array(
        z
          .object({
            name: z.string(),
            count: z.number()
          })
          .partial()
      )
      .describe('Categories with article counts'),
    topics: z
      .array(
        z
          .object({
            name: z.string(),
            count: z.number()
          })
          .partial()
      )
      .describe('Topics with article counts'),
    people: z
      .array(
        z
          .object({
            wikidataId: z.string(),
            name: z.string(),
            count: z.number()
          })
          .partial()
      )
      .describe('People mentioned with article counts'),
    companies: z
      .array(
        z
          .object({
            companyId: z.string(),
            name: z.string(),
            count: z.number()
          })
          .partial()
      )
      .describe('Companies mentioned with article counts'),
    countries: z
      .array(
        z
          .object({
            name: z.string(),
            count: z.number()
          })
          .partial()
      )
      .describe('Countries with article counts'),
    keyArticleTitle: z
      .string()
      .optional()
      .describe('Title of the representative article for this story'),
    keyArticleUrl: z
      .string()
      .optional()
      .describe('URL of the representative article for this story')
  })
  .partial();

export let searchStories = SlateTool.create(spec, {
  name: 'Search Stories',
  key: 'search_stories',
  description: `Search story clusters — groups of related articles covering the same event or topic. Returns aggregate data including article counts, sentiment breakdown, AI-generated summaries, and entity mentions across all articles in each cluster. Use the returned storyId with the Search Articles tool (as clusterId) to retrieve individual articles within a story.`,
  instructions: [
    'Each story groups all articles about the same event — use this to identify trending stories and measure coverage scope',
    'The storyId can be passed to Search Articles as clusterId to get all articles in a story'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clusterId: z.string().optional().describe('Retrieve a story by its story ID'),
      updatedFrom: z
        .string()
        .optional()
        .describe('Only stories updated on or after this ISO 8601 date'),
      updatedTo: z
        .string()
        .optional()
        .describe('Only stories updated on or before this ISO 8601 date'),
      minClusterSize: z
        .number()
        .optional()
        .describe('Minimum number of unique articles in a story'),
      query: z.string().optional().describe('Search keywords with optional Boolean operators'),
      source: z.string().optional().describe('Filter by source domain'),
      sourceGroup: z
        .enum(['top10', 'top50', 'top100', 'top500', 'top1000'])
        .optional()
        .describe('Filter by pre-defined source group'),
      category: z.string().optional().describe('Filter by category'),
      topic: z.string().optional().describe('Filter by topic'),
      country: z.string().optional().describe('Filter by country code'),
      language: z
        .string()
        .optional()
        .describe(
          'Legacy passthrough retained for compatibility; Perigon documents language filtering only for articles, with no documented filtering effect here'
        ),
      personName: z.string().optional().describe('Filter by person mentioned'),
      companyName: z.string().optional().describe('Filter by company mentioned'),
      dateFrom: z.string().optional().describe('Start date filter (ISO 8601)'),
      dateTo: z.string().optional().describe('End date filter (ISO 8601)'),
      showDuplicates: z
        .boolean()
        .optional()
        .describe('Include duplicate story clusters (default: false)'),
      sortBy: z
        .enum(['date', 'relevance', 'createdAt', 'updatedAt', 'count', 'totalCount'])
        .optional()
        .describe('Sort order'),
      page: z.number().optional().describe('Page number (zero-based)'),
      size: z.number().optional().describe('Results per page (1-100, default: 10)')
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.unknown())
        .describe('Complete provider response, including unavailable enrichment values'),
      numResults: z.number().describe('Total number of matching stories'),
      stories: z.array(storySchema).describe('List of matching story clusters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerigonClient(ctx.auth.token);

    let result = await client.searchStories({
      clusterId: ctx.input.clusterId,
      updatedFrom: ctx.input.updatedFrom,
      updatedTo: ctx.input.updatedTo,
      minClusterSize: ctx.input.minClusterSize,
      q: ctx.input.query,
      source: ctx.input.source,
      sourceGroup: ctx.input.sourceGroup,
      category: ctx.input.category,
      topic: ctx.input.topic,
      country: ctx.input.country,
      language: ctx.input.language,
      personName: ctx.input.personName,
      companyName: ctx.input.companyName,
      from: ctx.input.dateFrom,
      to: ctx.input.dateTo,
      showDuplicates: ctx.input.showDuplicates,
      sortBy: ctx.input.sortBy === 'date' ? 'createdAt' : ctx.input.sortBy,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let stories = result.results.map(formatStory);

    return {
      output: {
        raw: result,
        numResults: result.numResults,
        stories
      },
      message: `Found **${result.numResults}** story clusters (showing ${stories.length} on this page).`
    };
  })
  .build();

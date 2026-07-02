import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeuronWriterClient } from '../lib/client';
import { spec } from '../spec';

export let getRecommendations = SlateTool.create(spec, {
  name: 'Get Recommendations',
  key: 'get_recommendations',
  description: `Retrieve SEO recommendations for a query, including term suggestions for titles, headings, and body content, content metrics (word count, readability), entity recommendations, content ideas (questions, People Also Ask), and SERP competitor data. The query must be in "ready" status for recommendations to be available.`,
  instructions: ['If status is not "ready", wait and retry after ~60 seconds.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      queryId: z.string().describe('Query ID to retrieve recommendations for')
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .describe('Query analysis status (waiting, in progress, ready, not found)'),
      queryId: z.string().optional().describe('Query identifier'),
      keyword: z.string().optional().describe('Target keyword'),
      language: z.string().optional().describe('Content language'),
      engine: z.string().optional().describe('Search engine used'),
      tags: z.array(z.string()).optional().describe('Query tags'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      metrics: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Content metrics including target word count and readability scores based on SERP median values'
        ),
      termsSummary: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Recommended terms for title, description, H1, H2, and content in text format'
        ),
      terms: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Detailed term data with usage percentages and recommended occurrence ranges'
        ),
      ideas: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Content ideas including autocomplete suggestions, People Also Ask, and questions from competitors'
        ),
      competitors: z
        .array(z.any())
        .optional()
        .describe('SERP competitor URLs, titles, and content scores'),
      entities: z
        .array(z.any())
        .optional()
        .describe('Relevant named entities with importance and relevance scores')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeuronWriterClient(ctx.auth.token);
    let result = await client.getQuery(ctx.input.queryId);

    let output: Record<string, any> = {
      status: result.status
    };

    if (result.query) output.queryId = result.query;
    if (result.keyword) output.keyword = result.keyword;
    if (result.language) output.language = result.language;
    if (result.engine) output.engine = result.engine;
    if (result.tags) output.tags = result.tags;
    if (result.created) output.createdAt = result.created;
    if (result.updated) output.updatedAt = result.updated;
    if (result.metrics) output.metrics = result.metrics;
    if (result.terms_txt) output.termsSummary = result.terms_txt;
    if (result.terms) output.terms = result.terms;
    if (result.ideas) output.ideas = result.ideas;
    if (result.competitors) output.competitors = result.competitors;
    if (result.entities) output.entities = result.entities;

    let message = `Query status: **${result.status}**`;
    if (result.keyword) {
      message += ` for keyword **"${result.keyword}"**`;
    }
    if (result.status === 'ready') {
      message += '. Recommendations are available.';
    } else {
      message += '. Recommendations are not yet ready, please retry shortly.';
    }

    return {
      output: output as any,
      message
    };
  })
  .build();

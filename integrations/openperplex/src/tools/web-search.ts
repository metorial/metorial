import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sourceSchema = z.object({
  title: z.string().optional().describe('Title of the source'),
  url: z.string().optional().describe('URL of the source'),
  snippet: z.string().optional().describe('Snippet from the source')
});

let imageSchema = z.object({
  url: z.string().optional().describe('URL of the image'),
  description: z.string().optional().describe('Description of the image')
});

export let webSearch = SlateTool.create(spec, {
  name: 'Web Search',
  key: 'web_search',
  description: `Perform an AI-powered web search that returns an LLM-generated answer along with optional sources and images.
Useful for finding up-to-date information, answering factual questions, and researching topics with cited sources.
Supports localized results across 40+ countries, 14+ response languages, and multiple LLM models.`,
  instructions: [
    'Use the recencyFilter to narrow results to recent content when searching for current events or time-sensitive information.',
    'Set returnSources to true to get cited references for the answer.',
    'Use dateContext to provide temporal context like "Today is March 14, 2026" for time-aware queries.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The search question or query string'),
      model: z
        .enum(['gpt-4o-mini', 'gpt-4o', 'o3-mini-high', 'o3-mini-medium', 'gemini-2.0-flash'])
        .optional()
        .describe('LLM model to use for generating the answer'),
      location: z
        .string()
        .optional()
        .describe('Country code for localized results (e.g. "us", "gb", "fr", "de", "jp")'),
      responseLanguage: z
        .string()
        .optional()
        .describe(
          'Language code for the response (e.g. "en", "fr", "es"), or "auto" to detect from query'
        ),
      answerType: z
        .enum(['text', 'markdown', 'html'])
        .optional()
        .describe('Format of the generated answer'),
      searchType: z.enum(['general', 'news']).optional().describe('Type of search to perform'),
      dateContext: z
        .string()
        .optional()
        .describe(
          'Date context string for time-aware searches (e.g. "Today is Monday 14 of March 2026 and the time is 2:30 PM")'
        ),
      recencyFilter: z
        .enum(['hour', 'day', 'week', 'month', 'year', 'anytime'])
        .optional()
        .describe('Filter results by recency'),
      returnCitations: z
        .boolean()
        .optional()
        .describe('Include inline citations in the response'),
      returnSources: z
        .boolean()
        .optional()
        .describe('Include source references in the response'),
      returnImages: z.boolean().optional().describe('Include relevant images in the response')
    })
  )
  .output(
    z.object({
      llmResponse: z.string().describe('The AI-generated answer to the search query'),
      sources: z
        .array(sourceSchema)
        .optional()
        .describe('List of sources used to generate the answer'),
      images: z.array(imageSchema).optional().describe('List of relevant images found'),
      responseTime: z
        .number()
        .optional()
        .describe('Time taken to generate the response in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.search({
      query: ctx.input.query,
      model: ctx.input.model,
      location: ctx.input.location,
      responseLanguage: ctx.input.responseLanguage,
      answerType: ctx.input.answerType,
      searchType: ctx.input.searchType,
      dateContext: ctx.input.dateContext,
      recencyFilter: ctx.input.recencyFilter,
      returnCitations: ctx.input.returnCitations,
      returnSources: ctx.input.returnSources,
      returnImages: ctx.input.returnImages
    });

    let sourcesCount = result.sources?.length ?? 0;
    let imagesCount = result.images?.length ?? 0;
    let extras = [
      sourcesCount > 0 ? `${sourcesCount} source(s)` : null,
      imagesCount > 0 ? `${imagesCount} image(s)` : null,
      result.responseTime ? `${result.responseTime}s` : null
    ]
      .filter(Boolean)
      .join(', ');

    return {
      output: result,
      message: `Search completed for "${ctx.input.query}"${extras ? ` — ${extras}` : ''}.`
    };
  })
  .build();

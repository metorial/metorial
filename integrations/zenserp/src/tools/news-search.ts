import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let newsResultSchema = z
  .object({
    position: z.number().optional().describe('Position in results'),
    title: z.string().optional().describe('News article title'),
    url: z.string().optional().describe('URL of the news article'),
    source: z.string().optional().describe('News source name'),
    description: z.string().optional().describe('Article snippet'),
    thumbnail: z.string().optional().describe('Thumbnail image URL'),
    date: z.string().optional().describe('Publication date')
  })
  .passthrough();

let newsSearchResultSchema = z
  .object({
    query: z.record(z.string(), z.any()).optional().describe('Echo of query parameters'),
    newsResults: z.array(newsResultSchema).optional().describe('News search results')
  })
  .passthrough();

export let newsSearch = SlateTool.create(spec, {
  name: 'News Search',
  key: 'news_search',
  description: `Retrieve Google News results for any query, including article titles, descriptions, source names, thumbnails, and publication dates. Supports geotargeting and language filtering.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('News search query string'),
      location: z.string().optional().describe('Location for geotargeted results'),
      language: z.string().optional().describe('Language code (hl), e.g. "en"'),
      country: z.string().optional().describe('Country code (gl), e.g. "us"'),
      numResults: z.number().optional().describe('Number of results to return'),
      start: z.number().optional().describe('Result offset for pagination')
    })
  )
  .output(newsSearchResultSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.search({
      q: ctx.input.query,
      tbm: 'nws',
      location: ctx.input.location,
      hl: ctx.input.language,
      gl: ctx.input.country,
      num: ctx.input.numResults,
      start: ctx.input.start
    });

    let newsResults = results.news_results ?? results.organic ?? [];

    return {
      output: {
        ...results,
        newsResults
      },
      message: `Found **${newsResults.length}** news results for "${ctx.input.query}".`
    };
  })
  .build();

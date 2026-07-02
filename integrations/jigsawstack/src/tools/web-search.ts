import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let webSearch = SlateTool.create(spec, {
  name: 'Web Search',
  key: 'web_search',
  description: `AI-powered web search that returns structured results with an optional AI-generated overview. Returns search results, image URLs, related links, and geographic data when relevant.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query'),
      aiOverview: z
        .boolean()
        .optional()
        .describe('Include an AI-generated overview of the results (default: true)'),
      safeSearch: z
        .enum(['moderate', 'strict', 'off'])
        .optional()
        .describe('Safe search level (default: "moderate")'),
      spellCheck: z
        .boolean()
        .optional()
        .describe('Auto-correct spelling in query (default: true)'),
      countryCode: z.string().optional().describe('Country code to localize results'),
      autoScrape: z
        .boolean()
        .optional()
        .describe('Automatically scrape result pages for content (default: true)'),
      maxResults: z.number().optional().describe('Maximum number of results to return')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      query: z.string().describe('The query that was searched'),
      aiOverview: z.string().optional().describe('AI-generated summary of the search results'),
      spellFixed: z
        .boolean()
        .optional()
        .describe('Whether the query spelling was auto-corrected'),
      isSafe: z.boolean().optional().describe('Whether the query is considered safe'),
      results: z
        .array(
          z.object({
            title: z.string().optional(),
            url: z.string().optional(),
            description: z.string().optional(),
            content: z.string().optional(),
            isSafe: z.boolean().optional(),
            siteName: z.string().optional(),
            age: z.string().optional(),
            language: z.string().optional(),
            favicon: z.string().optional()
          })
        )
        .describe('Search results'),
      imageUrls: z.array(z.string()).optional().describe('Image URLs found in results'),
      links: z.array(z.string()).optional().describe('Related links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchWeb({
      query: ctx.input.query,
      aiOverview: ctx.input.aiOverview,
      safeSearch: ctx.input.safeSearch,
      spellCheck: ctx.input.spellCheck,
      countryCode: ctx.input.countryCode,
      autoScrape: ctx.input.autoScrape,
      maxResults: ctx.input.maxResults
    });

    let resultCount = result.results?.length ?? 0;

    return {
      output: {
        success: result.success,
        query: result.query,
        aiOverview: result.ai_overview,
        spellFixed: result.spell_fixed,
        isSafe: result.is_safe,
        results: (result.results ?? []).map((r: Record<string, unknown>) => ({
          title: r.title,
          url: r.url,
          description: r.description,
          content: r.content,
          isSafe: r.is_safe,
          siteName: r.site_name,
          age: r.age,
          language: r.language,
          favicon: r.favicon
        })),
        imageUrls: result.image_urls,
        links: result.links
      },
      message: `Searched for **"${ctx.input.query}"** and found **${resultCount} results**.${result.ai_overview ? ' AI overview generated.' : ''}`
    };
  })
  .build();

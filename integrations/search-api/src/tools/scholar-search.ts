import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchApiClient } from '../lib/client';
import { spec } from '../spec';

let scholarResultSchema = z.object({
  position: z.number().optional().describe('Position in results'),
  title: z.string().optional().describe('Paper or article title'),
  link: z.string().optional().describe('URL of the paper'),
  snippet: z.string().optional().describe('Abstract or summary snippet'),
  publicationInfo: z
    .string()
    .optional()
    .describe('Publication details (authors, journal, year)'),
  citedByCount: z.number().optional().describe('Number of citations'),
  citedByLink: z.string().optional().describe('URL to view citing papers'),
  relatedArticlesLink: z.string().optional().describe('URL to related articles'),
  resourceLink: z.string().optional().describe('Direct link to PDF or resource'),
  resourceType: z.string().optional().describe('Type of resource (e.g., PDF, HTML)')
});

export let scholarSearch = SlateTool.create(spec, {
  name: 'Google Scholar Search',
  key: 'scholar_search',
  description: `Search Google Scholar for academic papers, citations, and scholarly articles. Returns structured results with publication info, citation counts, and resource links. Supports year range filtering, citation lookups, and sorting by date or relevance.`,
  instructions: [
    'Use **yearFrom** and **yearTo** to restrict results to a specific publication date range.',
    'Set **citesArticleId** to find papers that cite a specific article.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query (optional if using citesArticleId)'),
      citesArticleId: z.string().optional().describe('Article ID to find citing papers'),
      clusterArticleId: z.string().optional().describe('Article ID to find related versions'),
      yearFrom: z.number().optional().describe('Earliest publication year'),
      yearTo: z.number().optional().describe('Latest publication year'),
      reviewArticlesOnly: z.boolean().optional().describe('Only return review articles'),
      includeCitations: z
        .boolean()
        .optional()
        .describe('Include citation entries (default: true)'),
      sortByDate: z.boolean().optional().describe('Sort by date instead of relevance'),
      num: z.number().optional().describe('Results per page (max 20)'),
      page: z.number().optional().describe('Results page number'),
      language: z.string().optional().describe('Interface language code')
    })
  )
  .output(
    z.object({
      searchQuery: z.string().optional().describe('The query that was searched'),
      totalResults: z.number().optional().describe('Total number of results'),
      scholarResults: z.array(scholarResultSchema).describe('Academic paper results'),
      currentPage: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchApiClient({ token: ctx.auth.token });

    let data = await client.search({
      engine: 'google_scholar',
      q: ctx.input.query,
      cites: ctx.input.citesArticleId,
      cluster: ctx.input.clusterArticleId,
      as_ylo: ctx.input.yearFrom,
      as_yhi: ctx.input.yearTo,
      as_rr: ctx.input.reviewArticlesOnly ? 1 : undefined,
      as_vis: ctx.input.includeCitations === false ? 1 : undefined,
      scisbd: ctx.input.sortByDate ? 1 : undefined,
      num: ctx.input.num,
      page: ctx.input.page,
      hl: ctx.input.language
    });

    let scholarResults = (data.organic_results || []).map((r: any) => ({
      position: r.position,
      title: r.title,
      link: r.link,
      snippet: r.snippet,
      publicationInfo: r.publication_info?.summary,
      citedByCount: r.inline_links?.cited_by?.total,
      citedByLink: r.inline_links?.cited_by?.link,
      relatedArticlesLink: r.inline_links?.related_articles?.link,
      resourceLink: r.resources?.[0]?.link,
      resourceType: r.resources?.[0]?.file_format
    }));

    return {
      output: {
        searchQuery: data.search_parameters?.q || ctx.input.query,
        totalResults: data.search_information?.total_results,
        scholarResults,
        currentPage: data.pagination?.current
      },
      message: `Found ${scholarResults.length} scholarly result${scholarResults.length !== 1 ? 's' : ''} for "${ctx.input.query || 'citation lookup'}".`
    };
  })
  .build();

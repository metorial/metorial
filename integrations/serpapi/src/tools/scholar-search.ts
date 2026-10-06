import { SlateTool } from 'slates';
import { z } from 'zod';
import { receiptMessage, receiptOutput, SerpApiClient } from '../lib/client';
import { number, searchMetadataSchema, text } from '../lib/contracts';
import { searchParams } from '../lib/params';
import { spec } from '../spec';

let scholarResultSchema = z.object({
  position: z.number().optional().describe('Position in results'),
  title: z.string().optional().describe('Paper title'),
  link: z.string().optional().describe('Paper URL'),
  resultId: z.string().optional().describe('Google Scholar result ID'),
  snippet: z.string().optional().describe('Paper abstract snippet'),
  publicationInfo: z.string().optional().describe('Publication information summary'),
  authors: z
    .array(
      z.object({
        name: z.string().optional(),
        authorId: z.string().optional(),
        link: z.string().optional()
      })
    )
    .optional()
    .describe('Paper authors'),
  citedByCount: z.number().optional().describe('Number of citations'),
  citedByLink: z.string().optional().describe('Link to citing papers'),
  year: z.string().optional().describe('Publication year'),
  pdfLink: z.string().optional().describe('Direct link to PDF if available')
});

export let scholarSearchTool = SlateTool.create(spec, {
  name: 'Scholar Search',
  key: 'scholar_search',
  description: `Search Google Scholar for academic papers, citations, and research. Returns paper titles, authors, publication info, citation counts, and links. Supports filtering by year range, author, and citation lookups.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query for academic papers'),
      cites: z
        .string()
        .optional()
        .describe('Google Scholar result ID to find papers that cite this paper'),
      authorId: z
        .string()
        .optional()
        .describe('Google Scholar author ID to retrieve author profile and publications'),
      yearLow: z.number().optional().describe('Filter results from this year onward'),
      yearHigh: z.number().optional().describe('Filter results up to this year'),
      language: z.string().optional().describe('Language code (e.g., "en")'),
      page: z
        .number()
        .optional()
        .describe('Page number (0-indexed, each page has ~10 results)'),
      sortByDate: z.boolean().optional().describe('Sort results by date instead of relevance'),
      async: z
        .boolean()
        .optional()
        .describe(
          'Submit asynchronously and return the native search ID/status. Not compatible with noCache or Ludicrous Speed accounts.'
        ),
      noCache: z.boolean().optional().describe('Force fresh results')
    })
  )
  .output(
    z.object({
      isComplete: z
        .boolean()
        .describe(
          'Whether native search status is Success; queued/processing receipts are incomplete.'
        ),
      pagination: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Native pagination metadata; follow native offsets/tokens without inferring a total.'
        ),
      searchMetadata: searchMetadataSchema.optional(),
      scholarResults: z.array(scholarResultSchema).describe('Academic paper results'),
      authorProfile: z
        .object({
          name: z.string().optional(),
          affiliations: z.string().optional(),
          email: z.string().optional(),
          citedBy: z.number().optional(),
          interests: z
            .array(
              z.object({
                title: z.string().optional(),
                link: z.string().optional()
              })
            )
            .optional()
        })
        .optional()
        .describe('Author profile information (when searching by authorId)'),
      totalResults: z.number().optional().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SerpApiClient({ apiKey: ctx.auth.token, accountId: ctx.auth.accountId });

    let params = searchParams('scholar_search', ctx.input);

    let data = await client.search(params);

    let scholarResults = (data.organic_results || data.articles || []).map((r: any) => ({
      position: r.position,
      title: r.title,
      link: r.link,
      resultId: r.result_id ?? r.citation_id,
      snippet: r.snippet,
      publicationInfo: r.publication_info?.summary ?? r.publication,
      authors: r.publication_info?.authors?.map((a: any) => ({
        name: a.name,
        authorId: a.author_id,
        link: a.link
      })),
      citedByCount: r.inline_links?.cited_by?.total ?? r.cited_by?.value,
      citedByLink: r.inline_links?.cited_by?.link ?? r.cited_by?.link,
      year: text(r.year) ?? (number(r.year) !== undefined ? String(r.year) : undefined),
      pdfLink: r.resources?.find((resource: any) => resource.file_format === 'PDF')?.link
    }));

    let authorProfile = data.author
      ? {
          name: data.author.name,
          affiliations: data.author.affiliations,
          email: data.author.email,
          citedBy: data.cited_by?.table?.[0]?.citations?.all,
          interests: data.author.interests?.map((i: any) => ({
            title: i.title,
            link: i.link
          }))
        }
      : undefined;

    let totalResults = data.search_information?.total_results;

    let message = ctx.input.authorId
      ? `Retrieved author profile for **${authorProfile?.name || 'unknown'}** with ${scholarResults.length} publications.`
      : `Scholar search${ctx.input.query ? ` for "${ctx.input.query}"` : ''} returned **${scholarResults.length}** results.`;

    return {
      output: {
        ...receiptOutput(data),
        scholarResults,
        authorProfile,
        totalResults
      },
      message: receiptMessage(data, message)
    };
  })
  .build();

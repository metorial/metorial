import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let paperSchema = z
  .object({
    paperId: z.string().nullable().optional().describe('Semantic Scholar paper ID'),
    corpusId: z.number().nullable().optional().describe('Semantic Scholar corpus ID'),
    title: z.string().nullable().optional().describe('Paper title'),
    abstract: z.string().nullable().optional().describe('Paper abstract'),
    year: z.number().nullable().optional().describe('Publication year'),
    venue: z.string().nullable().optional().describe('Publication venue'),
    citationCount: z.number().nullable().optional().describe('Total citation count'),
    referenceCount: z.number().nullable().optional().describe('Total reference count'),
    influentialCitationCount: z
      .number()
      .nullable()
      .optional()
      .describe('Influential citation count'),
    isOpenAccess: z
      .boolean()
      .nullable()
      .optional()
      .describe('Whether the paper has open access'),
    fieldsOfStudy: z.array(z.string()).nullable().optional().describe('Fields of study'),
    publicationDate: z
      .string()
      .nullable()
      .optional()
      .describe('Publication date (YYYY-MM-DD)'),
    publicationTypes: z.array(z.string()).nullable().optional().describe('Publication types'),
    url: z.string().nullable().optional().describe('Semantic Scholar URL'),
    openAccessPdf: z
      .object({
        url: z.string().nullable().optional(),
        status: z.string().nullable().optional()
      })
      .nullable()
      .optional()
      .describe('Open access PDF details'),
    tldr: z
      .object({
        model: z.string().nullable().optional(),
        text: z.string().nullable().optional()
      })
      .nullable()
      .optional()
      .describe('TLDR summary'),
    authors: z
      .array(
        z.object({
          authorId: z.string().nullable().optional(),
          name: z.string().nullable().optional()
        })
      )
      .nullable()
      .optional()
      .describe('Paper authors'),
    externalIds: z
      .record(z.string(), z.any())
      .nullable()
      .optional()
      .describe('External IDs (DOI, ArXiv, etc.)'),
    journal: z
      .object({
        name: z.string().nullable().optional(),
        volume: z.string().nullable().optional(),
        pages: z.string().nullable().optional()
      })
      .nullable()
      .optional()
      .describe('Journal information')
  })
  .passthrough();

export let searchPapers = SlateTool.create(spec, {
  name: 'Search Papers',
  key: 'search_papers',
  description: `Search for academic papers by keyword query. Returns papers ranked by relevance with metadata including title, abstract, authors, citation counts, and more.
Supports filtering by year range, publication date, publication type, fields of study, venue, minimum citation count, and open access availability.
Use the **fields** parameter to control which metadata is returned for each paper.`,
  instructions: [
    'Use fieldsOfStudy to filter by discipline (e.g. "Computer Science", "Medicine").',
    'Use publicationDateOrYear for date ranges like "2020-01-01:2023-12-31" or just a year like "2023".',
    'Use publicationTypes to filter by type (e.g. "JournalArticle", "Conference", "Review").'
  ],
  constraints: [
    'Maximum 100 results per request.',
    'Maximum 1,000 total results retrievable via offset pagination.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query for finding papers'),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of fields to return (e.g. "title,abstract,authors,year,citationCount,tldr,openAccessPdf"). Defaults to "paperId,title".'
        ),
      offset: z.number().optional().describe('Pagination offset (default: 0)'),
      limit: z
        .number()
        .optional()
        .describe('Number of results per page (default: 100, max: 100)'),
      publicationTypes: z
        .string()
        .optional()
        .describe(
          'Comma-separated publication types to filter by (e.g. "JournalArticle,Conference")'
        ),
      openAccessPdf: z
        .string()
        .optional()
        .describe('Set to empty string to filter for papers with open access PDFs only'),
      minCitationCount: z.string().optional().describe('Minimum citation count threshold'),
      publicationDateOrYear: z
        .string()
        .optional()
        .describe('Date range filter (e.g. "2020-01-01:2023-12-31", "2023", "2020:")'),
      year: z
        .string()
        .optional()
        .describe('Year range filter (e.g. "2020-2023", "2020-", "-2023")'),
      venue: z.string().optional().describe('Comma-separated venue names to filter by'),
      fieldsOfStudy: z
        .string()
        .optional()
        .describe(
          'Comma-separated fields of study to filter by (e.g. "Computer Science,Physics")'
        )
    })
  )
  .output(
    z.object({
      total: z.number().describe('Approximate total number of matching papers'),
      offset: z.number().optional().describe('Current pagination offset'),
      next: z
        .number()
        .optional()
        .describe('Next offset value for pagination (absent if no more results)'),
      papers: z.array(paperSchema).describe('List of matching papers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchPapers({
      query: ctx.input.query,
      fields: ctx.input.fields,
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      publicationTypes: ctx.input.publicationTypes,
      openAccessPdf: ctx.input.openAccessPdf,
      minCitationCount: ctx.input.minCitationCount,
      publicationDateOrYear: ctx.input.publicationDateOrYear,
      year: ctx.input.year,
      venue: ctx.input.venue,
      fieldsOfStudy: ctx.input.fieldsOfStudy
    });

    let papers = result.data || [];

    return {
      output: {
        total: result.total ?? 0,
        offset: result.offset,
        next: result.next,
        papers
      },
      message: `Found approximately **${result.total ?? 0}** papers for query "${ctx.input.query}". Returned **${papers.length}** papers in this page.`
    };
  })
  .build();

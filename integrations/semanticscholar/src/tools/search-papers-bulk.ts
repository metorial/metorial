import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { paperSchema } from './search-papers';

export let paperFiltersSchema = z.object({
  fields: z
    .string()
    .optional()
    .describe('Comma-separated paper metadata fields. Defaults to paperId,title.'),
  publicationTypes: z
    .string()
    .optional()
    .describe('Comma-separated publication types, such as JournalArticle,Conference.'),
  openAccessPdf: z
    .string()
    .optional()
    .describe('Use an empty string to require a public PDF.'),
  minCitationCount: z
    .string()
    .optional()
    .describe('Minimum citation count as a non-negative integer string.'),
  publicationDateOrYear: z
    .string()
    .optional()
    .describe('Publication date or inclusive range, such as 2020:2024.'),
  year: z.string().optional().describe('Publication year or range, such as 2020-2024.'),
  venue: z.string().optional().describe('Comma-separated publication venue names.'),
  fieldsOfStudy: z.string().optional().describe('Comma-separated fields of study.')
});

export let searchPapersBulk = SlateTool.create(spec, {
  key: 'search_papers_bulk',
  name: 'Bulk Search Papers',
  description:
    'Search large sets of papers using Boolean query syntax, filters, sorting, and continuation tokens. Results are not ranked by relevance.',
  instructions: [
    'Repeat the same query, filters, and sort with the returned token to retrieve the next page.'
  ],
  constraints: [
    'Up to 1,000 papers per page and 10,000,000 papers per search.',
    'Nested citation and reference metadata is unavailable in bulk search.'
  ],
  tags: { readOnly: true }
})
  .input(
    paperFiltersSchema.extend({
      query: z
        .string()
        .optional()
        .describe(
          'Optional Boolean title/abstract query. Supports +, |, -, parentheses, quotes, and prefix wildcards.'
        ),
      token: z.string().optional().describe('Continuation token from the previous page.'),
      sort: z
        .string()
        .optional()
        .describe(
          'paperId, publicationDate, or citationCount, optionally followed by :asc or :desc.'
        )
    })
  )
  .output(
    z.object({
      total: z
        .union([z.string(), z.number()])
        .describe(
          'Approximate total matching papers, retaining the provider’s original string or number.'
        ),
      token: z
        .string()
        .optional()
        .describe('Continuation token, present when more results are available.'),
      papers: z.array(paperSchema).describe('Paper metadata on this page.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).searchPapersBulk(ctx.input);
    return {
      output: { total: result.total, token: result.token, papers: result.data },
      message: `Retrieved **${result.data.length}** papers on this page of approximately **${result.total}** matches.`
    };
  })
  .build();

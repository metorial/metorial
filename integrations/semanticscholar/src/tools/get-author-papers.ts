import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let paperSchema = z
  .object({
    paperId: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    abstract: z.string().nullable().optional(),
    year: z.number().nullable().optional(),
    venue: z.string().nullable().optional(),
    citationCount: z.number().nullable().optional(),
    referenceCount: z.number().nullable().optional(),
    influentialCitationCount: z.number().nullable().optional(),
    isOpenAccess: z.boolean().nullable().optional(),
    publicationDate: z.string().nullable().optional(),
    publicationTypes: z.array(z.string()).nullable().optional(),
    url: z.string().nullable().optional(),
    openAccessPdf: z
      .object({
        url: z.string().nullable().optional(),
        status: z.string().nullable().optional()
      })
      .nullable()
      .optional(),
    authors: z
      .array(
        z.object({
          authorId: z.string().nullable().optional(),
          name: z.string().nullable().optional()
        })
      )
      .nullable()
      .optional(),
    externalIds: z.record(z.string(), z.any()).nullable().optional()
  })
  .passthrough();

export let getAuthorPapers = SlateTool.create(spec, {
  name: 'Get Author Papers',
  key: 'get_author_papers',
  description: `Retrieve the list of papers published by a specific author. Returns paginated paper results with configurable metadata fields.
Supports filtering by publication date range.`,
  constraints: ['Maximum 1,000 results per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      authorId: z.string().describe('Semantic Scholar author ID'),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of paper fields to return (e.g. "title,year,citationCount,venue,authors,abstract,openAccessPdf"). Defaults to "paperId,title".'
        ),
      offset: z.number().optional().describe('Pagination offset (default: 0)'),
      limit: z
        .number()
        .optional()
        .describe('Number of results per page (default: 100, max: 1000)'),
      publicationDateOrYear: z
        .string()
        .optional()
        .describe('Filter by publication date range (e.g. "2020-01-01:2023-12-31", "2023")')
    })
  )
  .output(
    z.object({
      offset: z.number().optional().describe('Current pagination offset'),
      next: z.number().optional().describe('Next offset for pagination'),
      papers: z.array(paperSchema).describe('List of papers by the author')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAuthorPapers(ctx.input.authorId, {
      fields: ctx.input.fields,
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      publicationDateOrYear: ctx.input.publicationDateOrYear
    });

    let papers = result.data || [];

    return {
      output: {
        offset: result.offset,
        next: result.next,
        papers
      },
      message: `Retrieved **${papers.length}** papers for author "${ctx.input.authorId}".${result.next ? ` More results available at offset ${result.next}.` : ''}`
    };
  })
  .build();

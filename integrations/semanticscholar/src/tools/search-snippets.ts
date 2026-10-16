import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchSnippets = SlateTool.create(spec, {
  key: 'search_snippets',
  name: 'Search Paper Snippets',
  description:
    'Find relevant excerpts from paper titles, abstracts, and body text, with source metadata, retrieval scores, and the provider’s license and usage notices.',
  constraints: [
    'Maximum 1,000 results; the provider returns 10 by default.',
    'Figure captions and bibliographies are excluded.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().describe('Plain-text search query.'),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated snippet fields, such as snippet.text,snippet.section. Paper metadata and scores are always returned.'
        ),
      paperIds: z
        .string()
        .optional()
        .describe(
          'Comma-separated paper IDs to search within; approximately 100 IDs are supported.'
        ),
      authors: z
        .string()
        .optional()
        .describe(
          'Comma-separated author names; fuzzy matching applies and all names must match.'
        ),
      minCitationCount: z
        .string()
        .optional()
        .describe('Minimum citation count as a non-negative integer string.'),
      insertedBefore: z
        .string()
        .optional()
        .describe('Exclusive insertion cutoff in YYYY, YYYY-MM, or YYYY-MM-DD format.'),
      publicationDateOrYear: z
        .string()
        .optional()
        .describe('Publication date or inclusive range, such as 2020:2024.'),
      year: z.string().optional().describe('Publication year or range, such as 2020-2024.'),
      venue: z.string().optional().describe('Comma-separated venue names.'),
      fieldsOfStudy: z.string().optional().describe('Comma-separated fields of study.'),
      limit: z.number().optional().describe('Integer maximum results from 1 to 1,000.')
    })
  )
  .output(
    z.object({
      snippets: z
        .array(
          z
            .object({
              score: z.number().optional(),
              snippet: z
                .object({
                  text: z.string().optional(),
                  snippetKind: z.string().optional(),
                  section: z.string().optional(),
                  snippetOffset: z
                    .object({ start: z.number().optional(), end: z.number().optional() })
                    .passthrough()
                    .optional(),
                  annotations: z.object({}).passthrough().optional()
                })
                .passthrough()
                .optional(),
              paper: z
                .object({
                  corpusId: z.string().optional(),
                  title: z.string().optional(),
                  authors: z.array(z.string()).optional(),
                  openAccessInfo: z
                    .object({
                      license: z.string().optional(),
                      status: z.string().optional(),
                      disclaimer: z.string().optional()
                    })
                    .passthrough()
                    .optional()
                })
                .passthrough()
                .optional()
            })
            .passthrough()
        )
        .describe('Ranked snippet matches, including original source and license metadata.'),
      retrievalVersion: z.string().optional().describe('Provider retrieval approach version.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).searchSnippets(ctx.input);
    return {
      output: { snippets: result.data, retrievalVersion: result.retrievalVersion },
      message: `Retrieved **${result.data.length}** snippet matches.`
    };
  })
  .build();

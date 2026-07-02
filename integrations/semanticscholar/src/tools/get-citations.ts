import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let citationSchema = z
  .object({
    contexts: z
      .array(z.string())
      .nullable()
      .optional()
      .describe('Text snippets where the citation appears'),
    intents: z
      .array(z.string())
      .nullable()
      .optional()
      .describe('Citation intents (e.g. "methodology", "background", "result")'),
    isInfluential: z
      .boolean()
      .nullable()
      .optional()
      .describe('Whether this is an influential citation'),
    citingPaper: z
      .object({
        paperId: z.string().nullable().optional(),
        corpusId: z.number().nullable().optional(),
        title: z.string().nullable().optional(),
        abstract: z.string().nullable().optional(),
        year: z.number().nullable().optional(),
        venue: z.string().nullable().optional(),
        citationCount: z.number().nullable().optional(),
        authors: z
          .array(
            z.object({
              authorId: z.string().nullable().optional(),
              name: z.string().nullable().optional()
            })
          )
          .nullable()
          .optional(),
        url: z.string().nullable().optional(),
        publicationDate: z.string().nullable().optional()
      })
      .passthrough()
      .nullable()
      .optional()
      .describe('The paper that cites the queried paper')
  })
  .passthrough();

let referenceSchema = z
  .object({
    contexts: z
      .array(z.string())
      .nullable()
      .optional()
      .describe('Text snippets where the reference appears'),
    intents: z.array(z.string()).nullable().optional().describe('Reference intents'),
    isInfluential: z
      .boolean()
      .nullable()
      .optional()
      .describe('Whether this is an influential reference'),
    citedPaper: z
      .object({
        paperId: z.string().nullable().optional(),
        corpusId: z.number().nullable().optional(),
        title: z.string().nullable().optional(),
        abstract: z.string().nullable().optional(),
        year: z.number().nullable().optional(),
        venue: z.string().nullable().optional(),
        citationCount: z.number().nullable().optional(),
        authors: z
          .array(
            z.object({
              authorId: z.string().nullable().optional(),
              name: z.string().nullable().optional()
            })
          )
          .nullable()
          .optional(),
        url: z.string().nullable().optional(),
        publicationDate: z.string().nullable().optional()
      })
      .passthrough()
      .nullable()
      .optional()
      .describe('The paper cited by the queried paper')
  })
  .passthrough();

export let getCitations = SlateTool.create(spec, {
  name: 'Get Citations & References',
  key: 'get_citations',
  description: `Explore the citation network of a paper. Retrieve either the **citations** (papers that cite the given paper) or the **references** (papers cited by the given paper).
Each result includes citation context snippets, intent classification, and metadata about the citing/cited paper.`,
  instructions: [
    'Set direction to "citations" for incoming citations (who cites this paper).',
    'Set direction to "references" for outgoing references (what this paper cites).',
    'Use fields to request additional metadata on citing/cited papers, e.g. "contexts,intents,isInfluential,citingPaper.title,citingPaper.authors,citingPaper.year".'
  ],
  constraints: ['Maximum 1,000 results per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      paperId: z.string().describe('Paper identifier (S2 ID, DOI:xxx, ARXIV:xxx, etc.)'),
      direction: z
        .enum(['citations', 'references'])
        .describe('Direction of citation graph traversal'),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated fields (e.g. "contexts,intents,isInfluential,citingPaper.title,citingPaper.authors" for citations, or "contexts,intents,isInfluential,citedPaper.title,citedPaper.authors" for references)'
        ),
      offset: z.number().optional().describe('Pagination offset (default: 0)'),
      limit: z
        .number()
        .optional()
        .describe('Number of results per page (default: 100, max: 1000)')
    })
  )
  .output(
    z.object({
      offset: z.number().optional().describe('Current pagination offset'),
      next: z
        .number()
        .optional()
        .describe('Next offset value for pagination (absent if no more results)'),
      citations: z
        .array(citationSchema)
        .optional()
        .describe('List of citing papers (when direction is "citations")'),
      references: z
        .array(referenceSchema)
        .optional()
        .describe('List of referenced papers (when direction is "references")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params = {
      fields: ctx.input.fields,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    };

    if (ctx.input.direction === 'citations') {
      let result = await client.getPaperCitations(ctx.input.paperId, params);
      let citations = result.data || [];

      return {
        output: {
          offset: result.offset,
          next: result.next,
          citations
        },
        message: `Retrieved **${citations.length}** citations for paper "${ctx.input.paperId}".${result.next ? ` More results available at offset ${result.next}.` : ''}`
      };
    } else {
      let result = await client.getPaperReferences(ctx.input.paperId, params);
      let references = result.data || [];

      return {
        output: {
          offset: result.offset,
          next: result.next,
          references
        },
        message: `Retrieved **${references.length}** references for paper "${ctx.input.paperId}".${result.next ? ` More results available at offset ${result.next}.` : ''}`
      };
    }
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let paperDetailSchema = z
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
      .describe('External IDs (DOI, ArXiv, PMID, etc.)'),
    journal: z
      .object({
        name: z.string().nullable().optional(),
        volume: z.string().nullable().optional(),
        pages: z.string().nullable().optional()
      })
      .nullable()
      .optional()
      .describe('Journal information'),
    publicationVenue: z
      .object({
        id: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
        url: z.string().nullable().optional()
      })
      .passthrough()
      .nullable()
      .optional()
      .describe('Publication venue details'),
    citationStyles: z
      .object({
        bibtex: z.string().nullable().optional()
      })
      .nullable()
      .optional()
      .describe('Citation styles'),
    embedding: z
      .object({
        model: z.string().nullable().optional(),
        vector: z.array(z.number()).nullable().optional()
      })
      .nullable()
      .optional()
      .describe('SPECTER2 embedding vector')
  })
  .passthrough();

export let getPaper = SlateTool.create(spec, {
  name: 'Get Paper Details',
  key: 'get_paper',
  description: `Retrieve detailed metadata for one or more academic papers. Supports lookup by Semantic Scholar ID, CorpusId, DOI, ArXiv ID, MAG, ACL, PMID, PMCID, or URL.
For single paper lookup, provide the **paperId**. For batch lookup of up to 500 papers, provide **paperIds** as an array.
Use the **fields** parameter to control which metadata is returned.`,
  instructions: [
    'For DOI lookup, prefix with "DOI:" (e.g. "DOI:10.18653/v1/N18-3011").',
    'For ArXiv lookup, prefix with "ARXIV:" (e.g. "ARXIV:2106.15928").',
    'For CorpusId lookup, prefix with "CorpusId:" (e.g. "CorpusId:215416146").',
    'For PMID lookup, prefix with "PMID:" (e.g. "PMID:19872477").'
  ],
  constraints: ['Batch lookup supports a maximum of 500 paper IDs.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      paperId: z
        .string()
        .optional()
        .describe(
          'Single paper identifier (S2 ID, DOI:xxx, ARXIV:xxx, CorpusId:xxx, PMID:xxx, PMCID:xxx, MAG:xxx, ACL:xxx, or URL)'
        ),
      paperIds: z
        .array(z.string())
        .optional()
        .describe('Array of paper identifiers for batch lookup (max 500)'),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of fields to return (e.g. "title,abstract,authors,year,citationCount,tldr,openAccessPdf,embedding,citationStyles"). Defaults to "paperId,title".'
        )
    })
  )
  .output(
    z.object({
      papers: z
        .array(paperDetailSchema.nullable())
        .describe('Paper details (null entries for papers not found in batch mode)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.paperIds && ctx.input.paperIds.length > 0) {
      let result = await client.getPapersBatch(ctx.input.paperIds, ctx.input.fields);
      let papers = Array.isArray(result) ? result : [];

      return {
        output: { papers },
        message: `Retrieved details for **${papers.filter((p: unknown) => p !== null).length}** of **${ctx.input.paperIds.length}** requested papers.`
      };
    }

    if (ctx.input.paperId) {
      let paper = await client.getPaper(ctx.input.paperId, ctx.input.fields);

      return {
        output: { papers: [paper] },
        message: `Retrieved details for paper: **${paper.title || ctx.input.paperId}**`
      };
    }

    return {
      output: { papers: [] },
      message: 'No paper ID provided. Please specify either `paperId` or `paperIds`.'
    };
  })
  .build();

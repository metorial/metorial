import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let paperSummarySchema = z
  .object({
    paperId: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    year: z.number().nullable().optional(),
    citationCount: z.number().nullable().optional(),
    venue: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    publicationDate: z.string().nullable().optional(),
    authors: z
      .array(
        z.object({
          authorId: z.string().nullable().optional(),
          name: z.string().nullable().optional()
        })
      )
      .nullable()
      .optional()
  })
  .passthrough();

let authorDetailSchema = z
  .object({
    authorId: z.string().nullable().optional().describe('Semantic Scholar author ID'),
    name: z.string().nullable().optional().describe('Author name'),
    url: z.string().nullable().optional().describe('Semantic Scholar profile URL'),
    affiliations: z.array(z.string()).nullable().optional().describe('Author affiliations'),
    homepage: z.string().nullable().optional().describe('Author homepage URL'),
    paperCount: z.number().nullable().optional().describe('Total number of papers'),
    citationCount: z.number().nullable().optional().describe('Total citation count'),
    hIndex: z.number().nullable().optional().describe('h-index'),
    externalIds: z.record(z.string(), z.any()).nullable().optional().describe('External IDs'),
    papers: z.array(paperSummarySchema).nullable().optional().describe('Author papers')
  })
  .passthrough();

export let getAuthor = SlateTool.create(spec, {
  name: 'Get Author Details',
  key: 'get_author',
  description: `Retrieve detailed profile information for one or more authors by their Semantic Scholar author IDs. Returns metadata including name, affiliations, paper count, citation count, h-index, and optionally their publication list.
For single author lookup, provide **authorId**. For batch lookup of up to 1,000 authors, provide **authorIds**.`,
  constraints: ['Batch lookup supports a maximum of 1,000 author IDs.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      authorId: z.string().optional().describe('Single Semantic Scholar author ID'),
      authorIds: z
        .array(z.string())
        .optional()
        .describe('Array of author IDs for batch lookup (max 1000)'),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of fields to return (e.g. "name,affiliations,paperCount,citationCount,hIndex,homepage,papers,papers.title,papers.year"). Defaults to "authorId,name".'
        )
    })
  )
  .output(
    z.object({
      authors: z
        .array(authorDetailSchema.nullable())
        .describe('Author details (null entries for authors not found in batch mode)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.authorIds && ctx.input.authorIds.length > 0) {
      let result = await client.getAuthorsBatch(ctx.input.authorIds, ctx.input.fields);
      let authors = Array.isArray(result) ? result : [];

      return {
        output: { authors },
        message: `Retrieved details for **${authors.filter((a: unknown) => a !== null).length}** of **${ctx.input.authorIds.length}** requested authors.`
      };
    }

    if (ctx.input.authorId) {
      let author = await client.getAuthor(ctx.input.authorId, ctx.input.fields);

      return {
        output: { authors: [author] },
        message: `Retrieved details for author: **${author.name || ctx.input.authorId}**`
      };
    }

    return {
      output: { authors: [] },
      message: 'No author ID provided. Please specify either `authorId` or `authorIds`.'
    };
  })
  .build();

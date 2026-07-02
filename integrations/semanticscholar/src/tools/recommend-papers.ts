import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let paperSchema = z
  .object({
    paperId: z.string().nullable().optional(),
    corpusId: z.number().nullable().optional(),
    title: z.string().nullable().optional(),
    abstract: z.string().nullable().optional(),
    year: z.number().nullable().optional(),
    venue: z.string().nullable().optional(),
    citationCount: z.number().nullable().optional(),
    referenceCount: z.number().nullable().optional(),
    isOpenAccess: z.boolean().nullable().optional(),
    publicationDate: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    authors: z
      .array(
        z.object({
          authorId: z.string().nullable().optional(),
          name: z.string().nullable().optional()
        })
      )
      .nullable()
      .optional(),
    openAccessPdf: z
      .object({
        url: z.string().nullable().optional(),
        status: z.string().nullable().optional()
      })
      .nullable()
      .optional(),
    tldr: z
      .object({
        model: z.string().nullable().optional(),
        text: z.string().nullable().optional()
      })
      .nullable()
      .optional(),
    externalIds: z.record(z.string(), z.any()).nullable().optional()
  })
  .passthrough();

export let recommendPapers = SlateTool.create(spec, {
  name: 'Recommend Papers',
  key: 'recommend_papers',
  description: `Get paper recommendations based on example papers. Two modes are available:
- **Single paper**: Provide one paper ID to get recommendations similar to it. Choose the pool: "recent" (recently published) or "all-cs" (all computer science papers).
- **Multi-paper**: Provide a list of positive example paper IDs (and optionally negative examples) to get recommendations based on the combined signal.`,
  instructions: [
    'For single-paper recommendations, provide positivePaperIds with exactly one paper ID and optionally set pool.',
    'For multi-paper recommendations, provide multiple positivePaperIds and optionally negativePaperIds.',
    'Negative paper IDs indicate papers the recommendations should NOT be related to.'
  ],
  constraints: [
    'Maximum 500 recommendations per request.',
    'Pool selection ("recent" or "all-cs") is only available for single-paper recommendations.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      positivePaperIds: z
        .array(z.string())
        .describe('Paper IDs to use as positive examples for recommendations'),
      negativePaperIds: z
        .array(z.string())
        .optional()
        .describe(
          'Paper IDs to use as negative examples (results should not be related to these)'
        ),
      pool: z
        .enum(['recent', 'all-cs'])
        .optional()
        .describe(
          'Paper pool for single-paper recommendations: "recent" (default) or "all-cs"'
        ),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of paper fields to return (e.g. "title,authors,year,citationCount,abstract,tldr")'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of recommendations (default: 100, max: 500)')
    })
  )
  .output(
    z.object({
      recommendedPapers: z.array(paperSchema).describe('List of recommended papers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let isSinglePaper =
      ctx.input.positivePaperIds.length === 1 &&
      (!ctx.input.negativePaperIds || ctx.input.negativePaperIds.length === 0);

    if (isSinglePaper) {
      let result = await client.getRecommendationsForPaper(ctx.input.positivePaperIds[0]!, {
        from: ctx.input.pool,
        limit: ctx.input.limit,
        fields: ctx.input.fields
      });

      let papers = result.recommendedPapers || [];

      return {
        output: { recommendedPapers: papers },
        message: `Found **${papers.length}** recommended papers similar to "${ctx.input.positivePaperIds[0]}".`
      };
    } else {
      let result = await client.getRecommendationsFromList(
        {
          positivePaperIds: ctx.input.positivePaperIds,
          negativePaperIds: ctx.input.negativePaperIds
        },
        {
          limit: ctx.input.limit,
          fields: ctx.input.fields
        }
      );

      let papers = result.recommendedPapers || [];

      return {
        output: { recommendedPapers: papers },
        message: `Found **${papers.length}** recommended papers based on **${ctx.input.positivePaperIds.length}** positive${ctx.input.negativePaperIds?.length ? ` and **${ctx.input.negativePaperIds.length}** negative` : ''} examples.`
      };
    }
  })
  .build();

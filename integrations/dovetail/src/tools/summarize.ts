import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let summarize = SlateTool.create(spec, {
  name: 'Summarize',
  key: 'summarize',
  description: `Generate an AI-powered summary (Magic Summarize) of research content. Provide IDs of highlights, notes, insights, themes, and/or tags to include in the summary. Optionally include citations linking back to source content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      highlightIds: z
        .array(z.string())
        .optional()
        .describe('Highlight IDs to include in the summary'),
      noteIds: z.array(z.string()).optional().describe('Note IDs to include in the summary'),
      insightIds: z
        .array(z.string())
        .optional()
        .describe('Insight IDs to include in the summary'),
      themeIds: z.array(z.string()).optional().describe('Theme IDs to include in the summary'),
      tagIds: z.array(z.string()).optional().describe('Tag IDs to include in the summary'),
      withCitations: z
        .boolean()
        .optional()
        .describe('Whether to include citations in the response (default false)')
    })
  )
  .output(
    z.object({
      summary: z.string(),
      citations: z
        .array(
          z.object({
            citationId: z.number(),
            sourceId: z.string(),
            sourceType: z.string()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.summarize({
      highlightIds: ctx.input.highlightIds,
      noteIds: ctx.input.noteIds,
      insightIds: ctx.input.insightIds,
      themeIds: ctx.input.themeIds,
      tagIds: ctx.input.tagIds,
      withCitations: ctx.input.withCitations
    });

    let citations = result.citations?.map(c => ({
      citationId: c.citation_id,
      sourceId: c.id,
      sourceType: c.type
    }));

    return {
      output: {
        summary: result.summary,
        citations
      },
      message: `Generated summary${citations?.length ? ` with **${citations.length}** citations` : ''}.`
    };
  })
  .build();

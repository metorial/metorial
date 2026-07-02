import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInsight = SlateTool.create(spec, {
  name: 'Get Insight',
  key: 'get_insight',
  description: `Retrieve a specific insight with full details. Optionally export the insight as HTML or Markdown.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      insightId: z.string().describe('The insight ID to retrieve'),
      exportFormat: z
        .enum(['html', 'markdown'])
        .optional()
        .describe('Optionally export the insight in this format')
    })
  )
  .output(
    z.object({
      insightId: z.string(),
      title: z.string(),
      previewText: z.string().nullable().optional(),
      projectId: z.string().nullable().optional(),
      projectTitle: z.string().nullable().optional(),
      authorId: z.string().nullable().optional(),
      published: z.boolean().optional(),
      publishedAt: z.string().nullable().optional(),
      contributors: z.array(z.string()).optional(),
      createdAt: z.string(),
      updatedAt: z.string(),
      exportedContent: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let insight = await client.getInsight(ctx.input.insightId);

    let exportedContent: any;
    if (ctx.input.exportFormat) {
      exportedContent = await client.exportInsight(
        ctx.input.insightId,
        ctx.input.exportFormat
      );
    }

    return {
      output: {
        insightId: insight.id,
        title: insight.title,
        previewText: insight.preview_text ?? null,
        projectId: insight.project_id ?? null,
        projectTitle: insight.project_title ?? null,
        authorId: insight.author_id ?? null,
        published: insight.published,
        publishedAt: insight.published_at ?? null,
        contributors: insight.contributors,
        createdAt: insight.created_at,
        updatedAt: insight.updated_at,
        exportedContent
      },
      message: `Retrieved insight **${insight.title}**${ctx.input.exportFormat ? ` (exported as ${ctx.input.exportFormat})` : ''}.`
    };
  })
  .build();

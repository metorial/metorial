import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageInsight = SlateTool.create(spec, {
  name: 'Manage Insight',
  key: 'manage_insight',
  description: `Create, update, or delete an insight in Dovetail. Insights represent key findings and conclusions from research. Supports publishing/unpublishing and managing contributors.`,
  instructions: [
    'To create an insight, provide at least a title or content.',
    'To update, provide the insightId along with fields to change. Use "published" to publish or unpublish.',
    'To delete, provide the insightId and set action to "delete".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      insightId: z.string().optional().describe('Insight ID (required for update and delete)'),
      title: z.string().optional().describe('Insight title'),
      content: z.string().optional().describe('Insight content body'),
      published: z
        .boolean()
        .optional()
        .describe('Whether the insight should be published (update only)'),
      contributors: z
        .array(z.string())
        .optional()
        .describe('Contributor user IDs (update only)'),
      fields: z
        .array(
          z.object({
            label: z.string().describe('Field label'),
            value: z.string().nullable().optional().describe('Field value')
          })
        )
        .optional()
        .describe('Custom fields (create only)')
    })
  )
  .output(
    z.object({
      insightId: z.string(),
      title: z.string().optional(),
      published: z.boolean().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let insight = await client.createInsight({
        title: ctx.input.title,
        content: ctx.input.content,
        fields: ctx.input.fields
      });
      return {
        output: {
          insightId: insight.id,
          title: insight.title,
          published: insight.published,
          createdAt: insight.created_at,
          updatedAt: insight.updated_at
        },
        message: `Created insight **${insight.title || 'Untitled'}** (ID: ${insight.id}).`
      };
    }

    if (!ctx.input.insightId) {
      throw new Error('insightId is required for update and delete actions');
    }

    if (ctx.input.action === 'update') {
      let insight = await client.updateInsight(ctx.input.insightId, {
        title: ctx.input.title,
        content: ctx.input.content,
        published: ctx.input.published,
        contributors: ctx.input.contributors
      });
      return {
        output: {
          insightId: insight.id,
          title: insight.title,
          published: insight.published,
          updatedAt: insight.updated_at
        },
        message: `Updated insight **${insight.title || ctx.input.insightId}**.`
      };
    }

    // delete
    let result = await client.deleteInsight(ctx.input.insightId);
    return {
      output: {
        insightId: result.id,
        title: result.title,
        deleted: true
      },
      message: `Deleted insight **${result.title || ctx.input.insightId}**. It can be restored from trash within 30 days.`
    };
  })
  .build();

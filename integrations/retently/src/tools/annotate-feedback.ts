import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let annotateFeedback = SlateTool.create(spec, {
  name: 'Annotate Feedback',
  key: 'annotate_feedback',
  description: `Add topics and/or tags to a survey response. Topics include a sentiment (positive, neutral, or negative).
You can choose to append new topics/tags to existing ones or replace them entirely.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      responseId: z.string().describe('ID of the feedback response to annotate'),
      topics: z
        .array(
          z.object({
            name: z.string().describe('Topic name'),
            sentiment: z.enum(['positive', 'neutral', 'negative']).describe('Topic sentiment')
          })
        )
        .optional()
        .describe('Topics to add to the response'),
      tags: z.array(z.string()).optional().describe('Tags to add to the response'),
      operation: z
        .enum(['append', 'override'])
        .optional()
        .describe('Whether to append to or replace existing topics/tags (default: override)')
    })
  )
  .output(
    z.object({
      topicsUpdated: z.boolean().describe('Whether topics were updated'),
      tagsUpdated: z.boolean().describe('Whether tags were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let topicsUpdated = false;
    let tagsUpdated = false;

    if (ctx.input.topics && ctx.input.topics.length > 0) {
      await client.setResponseTopics(
        ctx.input.responseId,
        ctx.input.topics,
        ctx.input.operation
      );
      topicsUpdated = true;
    }

    if (ctx.input.tags && ctx.input.tags.length > 0) {
      await client.setResponseTags(ctx.input.responseId, ctx.input.tags, ctx.input.operation);
      tagsUpdated = true;
    }

    let parts: string[] = [];
    if (topicsUpdated) parts.push(`${ctx.input.topics!.length} topic(s)`);
    if (tagsUpdated) parts.push(`${ctx.input.tags!.length} tag(s)`);

    return {
      output: { topicsUpdated, tagsUpdated },
      message:
        parts.length > 0
          ? `Updated response **${ctx.input.responseId}** with ${parts.join(' and ')} (${ctx.input.operation ?? 'override'}).`
          : `No topics or tags provided; nothing updated.`
    };
  })
  .build();

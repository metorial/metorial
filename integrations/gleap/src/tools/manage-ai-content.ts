import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let manageAiContent = SlateTool.create(spec, {
  name: 'Manage AI Content',
  key: 'manage_ai_content',
  description: `Create, update, retrieve, or delete AI content that powers Gleap's AI assistant (Kai). AI content is used for automated customer support responses.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'delete']).describe('Action to perform'),
      contentId: z
        .string()
        .optional()
        .describe('Content ID (required for get, update, delete)'),
      contentData: z
        .record(z.string(), z.any())
        .optional()
        .describe('AI content data (required for create and update)')
    })
  )
  .output(
    z.object({
      content: z.record(z.string(), z.any()).optional().describe('The AI content object'),
      deleted: z.boolean().optional().describe('Whether the content was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.contentData) {
        throw new Error('contentData is required when creating AI content');
      }
      let content = await client.createAiContent(ctx.input.contentData);
      return {
        output: { content },
        message: `Created AI content.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.contentId) {
        throw new Error('contentId is required when getting AI content');
      }
      let content = await client.getAiContent(ctx.input.contentId);
      return {
        output: { content },
        message: `Retrieved AI content **${ctx.input.contentId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.contentId) {
        throw new Error('contentId is required when updating AI content');
      }
      let content = await client.updateAiContent(
        ctx.input.contentId,
        ctx.input.contentData || {}
      );
      return {
        output: { content },
        message: `Updated AI content **${ctx.input.contentId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.contentId) {
        throw new Error('contentId is required when deleting AI content');
      }
      await client.deleteAiContent(ctx.input.contentId);
      return {
        output: { deleted: true },
        message: `Deleted AI content **${ctx.input.contentId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();

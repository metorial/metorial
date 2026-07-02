import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let manageArticle = SlateTool.create(spec, {
  name: 'Manage Help Center Article',
  key: 'manage_article',
  description: `Create, update, or delete a help center article within a collection. Articles can be published or saved as drafts.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      collectionId: z.string().describe('Collection ID the article belongs to'),
      articleId: z.string().optional().describe('Article ID (required for update and delete)'),
      title: z.string().optional().describe('Article title (required for create)'),
      description: z.string().optional().describe('Brief article description'),
      content: z.any().optional().describe('Full article content (rich format)'),
      plainContent: z.string().optional().describe('Plain text version of the article'),
      isDraft: z
        .boolean()
        .optional()
        .describe('Whether the article is a draft (default: true)'),
      tags: z.array(z.string()).optional().describe('Article tags'),
      targetAudience: z.string().optional().describe('Target audience')
    })
  )
  .output(
    z.object({
      article: z
        .record(z.string(), z.any())
        .optional()
        .describe('The article object (for create/update)'),
      deleted: z.boolean().optional().describe('Whether the article was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.title) {
        throw new Error('Title is required when creating an article');
      }
      let article = await client.createArticle(ctx.input.collectionId, {
        title: ctx.input.title,
        description: ctx.input.description,
        content: ctx.input.content,
        plainContent: ctx.input.plainContent,
        isDraft: ctx.input.isDraft,
        tags: ctx.input.tags,
        targetAudience: ctx.input.targetAudience
      });
      return {
        output: { article },
        message: `Created article **${ctx.input.title}** in collection **${ctx.input.collectionId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.articleId) {
        throw new Error('articleId is required when updating an article');
      }
      let article = await client.updateArticle(ctx.input.collectionId, ctx.input.articleId, {
        title: ctx.input.title,
        description: ctx.input.description,
        content: ctx.input.content,
        plainContent: ctx.input.plainContent,
        isDraft: ctx.input.isDraft,
        tags: ctx.input.tags,
        targetAudience: ctx.input.targetAudience
      });
      return {
        output: { article },
        message: `Updated article **${ctx.input.articleId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.articleId) {
        throw new Error('articleId is required when deleting an article');
      }
      await client.deleteArticle(ctx.input.collectionId, ctx.input.articleId);
      return {
        output: { deleted: true },
        message: `Deleted article **${ctx.input.articleId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();

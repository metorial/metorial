import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { intercomServiceError } from '../lib/errors';
import { stringOrUndefined, timestampOrUndefined } from '../lib/output';
import { spec } from '../spec';

export let manageArticles = SlateTool.create(spec, {
  name: 'Manage Articles',
  key: 'manage_articles',
  description: `Create, update, or delete help center articles in Intercom. Articles power the help center and provide content for the Fin AI agent.
Supports multilingual content through translated content fields.`,
  instructions: [
    'For "create", title and authorId are required.',
    'Set state to "published" or "draft" to control visibility.',
    'Use parentId and parentType to organize articles in collections.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      articleId: z.string().optional().describe('Article ID (required for update, delete)'),
      title: z.string().optional().describe('Article title (required for create)'),
      authorId: z.string().optional().describe('Author admin ID (required for create)'),
      body: z.string().optional().describe('Article body (HTML)'),
      description: z.string().optional().describe('Article description for search results'),
      state: z.enum(['published', 'draft']).optional().describe('Article publication state'),
      parentId: z.string().optional().describe('Parent collection or section ID'),
      parentType: z
        .string()
        .optional()
        .describe('Parent type (e.g., "collection", "section")'),
      translatedContent: z
        .record(z.string(), z.any())
        .optional()
        .describe('Translated content keyed by locale')
    })
  )
  .output(
    z.object({
      articleId: z.string().optional().describe('Article ID'),
      title: z.string().optional().describe('Article title'),
      authorId: z.string().optional().describe('Author ID'),
      state: z.string().optional().describe('Article state'),
      url: z.string().optional().describe('Article URL'),
      parentId: z.string().optional().describe('Parent collection/section ID'),
      parentType: z.string().optional().describe('Parent type'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether article was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.title || !ctx.input.authorId) {
        throw intercomServiceError('title and authorId are required for create');
      }
      let result = await client.createArticle({
        title: ctx.input.title,
        authorId: ctx.input.authorId,
        body: ctx.input.body,
        description: ctx.input.description,
        state: ctx.input.state,
        parentId: ctx.input.parentId,
        parentType: ctx.input.parentType,
        translatedContent: ctx.input.translatedContent
      });
      return {
        output: mapArticle(result),
        message: `Created article **${result.title}** (${result.state})`
      };
    }

    if (action === 'update') {
      if (!ctx.input.articleId) throw intercomServiceError('articleId is required for update');
      let result = await client.updateArticle(ctx.input.articleId, {
        title: ctx.input.title,
        authorId: ctx.input.authorId,
        body: ctx.input.body,
        description: ctx.input.description,
        state: ctx.input.state,
        parentId: ctx.input.parentId,
        parentType: ctx.input.parentType,
        translatedContent: ctx.input.translatedContent
      });
      return {
        output: mapArticle(result),
        message: `Updated article **${result.title || ctx.input.articleId}**`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.articleId) throw intercomServiceError('articleId is required for delete');
      await client.deleteArticle(ctx.input.articleId);
      return {
        output: { articleId: ctx.input.articleId, deleted: true },
        message: `Deleted article **${ctx.input.articleId}**`
      };
    }

    throw intercomServiceError(`Unknown action: ${action}`);
  })
  .build();

let mapArticle = (data: any) => ({
  articleId: stringOrUndefined(data.id),
  title: stringOrUndefined(data.title),
  authorId: data.author_id ? String(data.author_id) : undefined,
  state: stringOrUndefined(data.state),
  url: stringOrUndefined(data.url),
  parentId: data.parent_id ? String(data.parent_id) : undefined,
  parentType: stringOrUndefined(data.parent_type),
  createdAt: timestampOrUndefined(data.created_at),
  updatedAt: timestampOrUndefined(data.updated_at)
});

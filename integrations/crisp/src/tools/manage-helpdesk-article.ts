import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageHelpdeskArticle = SlateTool.create(spec, {
  name: 'Manage Helpdesk Article',
  key: 'manage_helpdesk_article',
  description: `Create, update, or delete a helpdesk knowledge base article. Articles are organized by locale for multi-language support. You can set the title, content, category, featured status, and order.`,
  instructions: [
    'To create a new article, provide localeId and title. Omit articleId.',
    'To update an existing article, provide both localeId and articleId along with the fields to update.',
    'To delete an article, provide localeId, articleId, and set delete to true.'
  ]
})
  .input(
    z.object({
      localeId: z.string().describe('Locale identifier (e.g., "en", "fr", "de")'),
      articleId: z.string().optional().describe('Article ID (omit to create a new article)'),
      title: z.string().optional().describe('Article title'),
      description: z.string().optional().describe('Article short description'),
      content: z.string().optional().describe('Article body content (HTML)'),
      featured: z.boolean().optional().describe('Mark article as featured'),
      order: z.number().optional().describe('Display order'),
      category: z.string().optional().describe('Article category'),
      delete: z.boolean().optional().describe('Set to true to delete the article')
    })
  )
  .output(
    z.object({
      articleId: z.string().optional().describe('Article ID'),
      action: z.enum(['created', 'updated', 'deleted']).describe('Action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, websiteId: ctx.config.websiteId });

    if (ctx.input.delete && ctx.input.articleId) {
      await client.deleteHelpdeskArticle(ctx.input.localeId, ctx.input.articleId);
      return {
        output: { articleId: ctx.input.articleId, action: 'deleted' as const },
        message: `Deleted helpdesk article **${ctx.input.articleId}**.`
      };
    }

    if (ctx.input.articleId) {
      let article: Record<string, any> = {};
      if (ctx.input.title !== undefined) article.title = ctx.input.title;
      if (ctx.input.description !== undefined) article.description = ctx.input.description;
      if (ctx.input.content !== undefined) article.content = ctx.input.content;
      if (ctx.input.featured !== undefined) article.featured = ctx.input.featured;
      if (ctx.input.order !== undefined) article.order = ctx.input.order;
      if (ctx.input.category !== undefined) article.category = ctx.input.category;

      await client.updateHelpdeskArticle(ctx.input.localeId, ctx.input.articleId, article);
      return {
        output: { articleId: ctx.input.articleId, action: 'updated' as const },
        message: `Updated helpdesk article **${ctx.input.articleId}**.`
      };
    }

    let result = await client.createHelpdeskArticle(ctx.input.localeId, {
      title: ctx.input.title || 'Untitled',
      description: ctx.input.description,
      content: ctx.input.content,
      featured: ctx.input.featured,
      order: ctx.input.order,
      category: ctx.input.category
    });

    return {
      output: { articleId: result?.article_id, action: 'created' as const },
      message: `Created new helpdesk article **${ctx.input.title}** in locale ${ctx.input.localeId}.`
    };
  })
  .build();

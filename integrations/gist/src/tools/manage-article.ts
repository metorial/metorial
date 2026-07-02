import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

let translationSchema = z.object({
  locale: z.string().describe('Locale code (e.g. "en")'),
  title: z.string().optional().describe('Article title'),
  description: z.string().optional().describe('Article description/excerpt'),
  htmlText: z.string().optional().describe('Article body as HTML'),
  status: z.enum(['published', 'draft']).optional().describe('Publication status')
});

export let manageArticle = SlateTool.create(spec, {
  name: 'Manage Article',
  key: 'manage_article',
  description: `Create, update, or delete a knowledge base article in Gist. Articles support multi-language translations and can be organized into collections.`
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      articleId: z.string().optional().describe('Article ID (required for update/delete)'),
      parentId: z.string().optional().describe('Parent collection ID'),
      defaultLocale: z.string().optional().describe('Default locale code (e.g. "en")'),
      translations: z.array(translationSchema).optional().describe('Article translations')
    })
  )
  .output(
    z.object({
      articleId: z.string().optional(),
      defaultLocale: z.string().optional(),
      translations: z.array(z.any()).optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'create': {
        let body: Record<string, any> = {};
        if (ctx.input.parentId) body.parent_id = ctx.input.parentId;
        if (ctx.input.defaultLocale) body.default_locale = ctx.input.defaultLocale;
        if (ctx.input.translations) {
          body.translations = ctx.input.translations.map(t => ({
            locale: t.locale,
            title: t.title,
            description: t.description,
            html_text: t.htmlText,
            status: t.status
          }));
        }
        let data = await client.createArticle(body);
        let article = data.article || data;
        return {
          output: {
            articleId: String(article.id),
            defaultLocale: article.default_locale,
            translations: article.translations
          },
          message: `Created article **${article.id}**.`
        };
      }

      case 'update': {
        if (!ctx.input.articleId) throw new Error('articleId is required for update');
        let body: Record<string, any> = {};
        if (ctx.input.parentId) body.parent_id = ctx.input.parentId;
        if (ctx.input.defaultLocale) body.default_locale = ctx.input.defaultLocale;
        if (ctx.input.translations) {
          body.translations = ctx.input.translations.map(t => ({
            locale: t.locale,
            title: t.title,
            description: t.description,
            html_text: t.htmlText,
            status: t.status
          }));
        }
        let data = await client.updateArticle(ctx.input.articleId, body);
        let article = data.article || data;
        return {
          output: {
            articleId: String(article.id),
            defaultLocale: article.default_locale,
            translations: article.translations
          },
          message: `Updated article **${ctx.input.articleId}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.articleId) throw new Error('articleId is required for delete');
        await client.deleteArticle(ctx.input.articleId);
        return {
          output: { deleted: true },
          message: `Deleted article **${ctx.input.articleId}**.`
        };
      }
    }
  })
  .build();

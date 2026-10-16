import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId, requireValue, translationsBody } from '../lib/response';
import { spec } from '../spec';

let translationSchema = z.object({
  locale: z.string().describe('Locale code (e.g. "en")'),
  authorId: z
    .string()
    .optional()
    .describe(
      'Author teammate ID; required for create. Call list_teams to discover teammates.'
    ),
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
      rawResponse: z.any().optional().describe('Complete provider response data'),
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
        if (!ctx.input.translations?.length)
          throw createApiServiceError('Provide article translations.');
        for (let translation of ctx.input.translations) {
          requireValue(translation.authorId, 'Translation authorId');
          requireValue(translation.title, 'Translation title');
          requireValue(translation.htmlText, 'Translation htmlText');
          requireValue(translation.status, 'Translation status');
        }
        let body: Record<string, any> = {};
        if (ctx.input.parentId) body.parent_id = ctx.input.parentId;
        if (ctx.input.defaultLocale) body.default_locale = ctx.input.defaultLocale;
        if (ctx.input.translations) {
          body.translations = translationsBody(ctx.input.translations);
        }
        let data = await client.createArticle(body);
        let article = data.article || data;
        return {
          output: {
            rawResponse: client.responses,
            articleId: requiredId(article.id),
            defaultLocale: article.default_locale,
            translations: article.translations
          },
          message: `Created article **${article.id}**.`
        };
      }

      case 'update': {
        if (!ctx.input.articleId)
          throw createApiServiceError('articleId is required for update');
        let body: Record<string, any> = {};
        if (ctx.input.parentId) body.parent_id = ctx.input.parentId;
        if (ctx.input.defaultLocale) body.default_locale = ctx.input.defaultLocale;
        if (ctx.input.translations) {
          body.translations = translationsBody(ctx.input.translations);
        }
        let data = await client.updateArticle(ctx.input.articleId, body);
        let article = data.article || data;
        return {
          output: {
            rawResponse: client.responses,
            articleId: requiredId(article.id),
            defaultLocale: article.default_locale,
            translations: article.translations
          },
          message: `Updated article **${ctx.input.articleId}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.articleId)
          throw createApiServiceError('articleId is required for delete');
        await client.deleteArticle(ctx.input.articleId);
        return {
          output: { rawResponse: client.responses, deleted: true },
          message: `Deleted article **${ctx.input.articleId}**.`
        };
      }
    }
  })
  .build();

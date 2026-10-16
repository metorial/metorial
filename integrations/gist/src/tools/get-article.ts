import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId } from '../lib/response';
import { spec } from '../spec';

export let getArticle = SlateTool.create(spec, {
  name: 'Get Article',
  key: 'get_article',
  description:
    'Retrieve a knowledge base article, including its language translations, author details, content, collection IDs, and statistics.',
  tags: { readOnly: true }
})
  .input(z.object({ articleId: z.string().describe('Article ID from list_articles') }))
  .output(
    z.object({
      articleId: z.string(),
      defaultLocale: z.string().optional(),
      parentId: z.string().optional(),
      translations: z.array(z.any()).optional(),
      statistics: z.any().optional(),
      rawResponse: z.any()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });
    let data = await client.getArticle(ctx.input.articleId);
    let article = data.article ?? data;
    return {
      output: {
        articleId: requiredId(article.id),
        defaultLocale: article.default_locale,
        parentId: article.parent_id === undefined ? undefined : requiredId(article.parent_id),
        translations: article.translations,
        statistics: article.statistics,
        rawResponse: client.responses
      },
      message: `Retrieved article **${requiredId(article.id)}**.`
    };
  })
  .build();

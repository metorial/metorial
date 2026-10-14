import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let getArticle = SlateTool.create(spec, {
  name: 'Get Help Center Article',
  key: 'get_article',
  description:
    'Retrieve a help center article and its stored content. Discover collection and article IDs with list_collections and list_articles. Optionally include content converted to HTML or Markdown.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      collectionId: z.string().describe('Collection ID from list_collections'),
      articleId: z.string().describe('Article ID from list_articles'),
      format: z.enum(['html', 'markdown']).optional().describe('Additional content format')
    })
  )
  .output(z.object({ article: z.record(z.string(), z.any()) }))
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId,
      region: ctx.auth.region
    });
    let article = await client.getArticle(
      ctx.input.collectionId,
      ctx.input.articleId,
      ctx.input.format
    );
    return {
      output: { article },
      message: `Retrieved article **${ctx.input.articleId}**.`
    };
  })
  .build();

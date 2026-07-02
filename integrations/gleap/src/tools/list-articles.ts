import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let listArticles = SlateTool.create(spec, {
  name: 'List Help Center Articles',
  key: 'list_articles',
  description: `Retrieve all articles within a help center collection, or search articles across all collections by keyword.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionId: z.string().optional().describe('Collection ID to list articles from'),
      searchTerm: z
        .string()
        .optional()
        .describe('Search term to find articles across all collections')
    })
  )
  .output(
    z.object({
      articles: z.array(z.record(z.string(), z.any())).describe('List of article objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    let articles: any;
    if (ctx.input.searchTerm) {
      let result = await client.searchArticles({ searchTerm: ctx.input.searchTerm });
      articles = Array.isArray(result) ? result : result.articles || result.data || [];
    } else if (ctx.input.collectionId) {
      articles = await client.listArticles(ctx.input.collectionId);
    } else {
      throw new Error('Either collectionId or searchTerm must be provided');
    }

    let articleList = Array.isArray(articles) ? articles : [];

    return {
      output: { articles: articleList },
      message: `Retrieved **${articleList.length}** articles.`
    };
  })
  .build();

import { createApiServiceError, SlateTool } from 'slates';
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
        .describe('Search term to find articles across all collections'),
      helpCenterDomain: z
        .string()
        .optional()
        .describe(
          'Help center hostname (for example acme.gleap.help) for published-article search'
        ),
      password: z
        .string()
        .optional()
        .describe('Password for a protected help center, used with helpCenterDomain'),
      lang: z
        .string()
        .optional()
        .describe('Language for published-article search; defaults to en')
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
      projectId: ctx.auth.projectId,
      region: ctx.auth.region
    });

    let articles: any;
    if (ctx.input.searchTerm) {
      let result = await client.searchArticles({
        searchTerm: ctx.input.searchTerm,
        helpCenterDomain: ctx.input.helpCenterDomain,
        password: ctx.input.password,
        lang: ctx.input.lang,
        collectionId: ctx.input.collectionId
      });
      articles = Array.isArray(result)
        ? result
        : (result?.data?.hits ?? result?.articles ?? result?.data ?? []);
    } else if (ctx.input.collectionId) {
      articles = await client.listArticles(ctx.input.collectionId);
    } else {
      throw createApiServiceError('Either collectionId or searchTerm must be provided');
    }

    let articleList = Array.isArray(articles) ? articles : [];

    return {
      output: { articles: articleList },
      message: `Retrieved **${articleList.length}** articles.`
    };
  })
  .build();

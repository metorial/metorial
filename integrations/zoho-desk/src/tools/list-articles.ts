import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listArticles = SlateTool.create(spec, {
  name: 'List Articles',
  key: 'list_articles',
  description: `List knowledge base articles within a specific category. Also supports listing KB categories if no category ID is provided.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      categoryId: z
        .string()
        .optional()
        .describe(
          'KB category ID to list articles from. If omitted, lists root categories instead.'
        ),
      status: z
        .string()
        .optional()
        .describe('Filter articles by status (e.g., Draft, Published)'),
      from: z.number().optional().describe('Starting index for pagination'),
      limit: z.number().optional().describe('Number of items to return')
    })
  )
  .output(
    z.object({
      articles: z
        .array(
          z.object({
            articleId: z.string().describe('Article ID'),
            title: z.string().optional().describe('Article title'),
            status: z.string().optional().describe('Article status'),
            categoryId: z.string().optional().describe('Category ID'),
            permalink: z.string().optional().describe('Permalink'),
            modifiedTime: z.string().optional().describe('Last modification time')
          })
        )
        .optional()
        .describe('List of articles (when categoryId is provided)'),
      categories: z
        .array(
          z.object({
            categoryId: z.string().describe('Category ID'),
            name: z.string().optional().describe('Category name'),
            description: z.string().optional().describe('Category description')
          })
        )
        .optional()
        .describe('List of KB categories (when categoryId is omitted)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.categoryId) {
      let result = await client.listArticles(ctx.input.categoryId, {
        status: ctx.input.status,
        from: ctx.input.from,
        limit: ctx.input.limit
      });

      let data = Array.isArray(result) ? result : result?.data || [];

      let articles = data.map((a: any) => ({
        articleId: a.id,
        title: a.title,
        status: a.status,
        categoryId: a.categoryId,
        permalink: a.permalink,
        modifiedTime: a.modifiedTime
      }));

      return {
        output: { articles, categories: undefined },
        message: `Found **${articles.length}** article(s) in category ${ctx.input.categoryId}`
      };
    } else {
      let result = await client.listKBCategories({
        from: ctx.input.from,
        limit: ctx.input.limit
      });

      let data = Array.isArray(result) ? result : result?.data || [];

      let categories = data.map((c: any) => ({
        categoryId: c.id,
        name: c.name,
        description: c.description
      }));

      return {
        output: { articles: undefined, categories },
        message: `Found **${categories.length}** KB category(ies)`
      };
    }
  })
  .build();

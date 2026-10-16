import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId, responseList, validatePagination } from '../lib/response';
import { spec } from '../spec';

export let listArticles = SlateTool.create(spec, {
  name: 'List Articles',
  key: 'list_articles',
  description: `List or search knowledge base articles. Filter by status, collection, or author. Also supports text search by keyword and locale.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page'),
      status: z
        .enum(['published', 'draft'])
        .optional()
        .describe('Filter by publication status'),
      collectionId: z.string().optional().describe('Filter by collection ID'),
      authorId: z.string().optional().describe('Filter by author ID'),
      searchQuery: z.string().optional().describe('Text search query'),
      searchLocale: z.string().optional().describe('Locale to search in')
    })
  )
  .output(
    z.object({
      rawResponse: z.any().optional().describe('Complete provider response data'),
      articles: z.array(
        z.object({
          articleId: z.string(),
          defaultLocale: z.string().optional(),
          parentId: z.string().optional(),
          translations: z.array(z.any()).optional(),
          statistics: z.any().optional()
        })
      ),
      pages: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    validatePagination({ page: ctx.input.page, perPage: ctx.input.perPage });
    let client = new GistClient({ token: ctx.auth.token });

    let articles: any[];
    let pages: any;

    if (ctx.input.searchQuery) {
      let data = await client.searchArticles(
        {
          search_text: ctx.input.searchQuery,
          locale: ctx.input.searchLocale
        },
        { page: ctx.input.page, per_page: ctx.input.perPage }
      );
      articles = responseList(data.articles);
      pages = data.pages;
    } else {
      let data = await client.listArticles({
        page: ctx.input.page,
        per_page: ctx.input.perPage,
        status: ctx.input.status,
        collection_id: ctx.input.collectionId,
        author_id: ctx.input.authorId
      });
      articles = responseList(data.articles);
      pages = data.pages;
    }

    let mapped = articles.map((a: any) => ({
      articleId: requiredId(a.id),
      defaultLocale: a.default_locale,
      parentId: a.parent_id !== undefined ? String(a.parent_id) : undefined,
      translations: a.translations,
      statistics: a.statistics
    }));

    return {
      output: { rawResponse: client.responses, articles: mapped, pages },
      message: `Found **${mapped.length}** articles.`
    };
  })
  .build();

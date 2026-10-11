import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsClient } from '../lib/docs-client';
import { helpscoutServiceError } from '../lib/errors';
import { docsListInfo } from '../lib/pagination';
import { spec } from '../spec';

export let manageDocs = SlateTool.create(spec, {
  name: 'Manage Knowledge Base',
  key: 'manage_docs',
  description: `Manage Help Scout Docs knowledge base content. List sites, collections, categories, and articles. Create, update, or delete articles and collections. Search articles. **Requires a Docs API key** configured in authentication.`,
  instructions: [
    'This tool requires a Docs API key to be set during authentication.',
    'The Docs API is separate from the Inbox API and uses different authentication.'
  ],
  constraints: ['Only available when a Docs API key has been configured.']
})
  .input(
    z.object({
      action: z
        .enum([
          'list_sites',
          'list_collections',
          'get_collection',
          'create_collection',
          'update_collection',
          'delete_collection',
          'list_categories',
          'create_category',
          'update_category',
          'delete_category',
          'list_articles',
          'get_article',
          'create_article',
          'update_article',
          'delete_article',
          'search_articles'
        ])
        .describe('Action to perform'),
      siteId: z
        .string()
        .optional()
        .describe(
          'Site ID (required for create_collection; optional filter for list_collections and search_articles). Use list_sites to discover IDs.'
        ),
      collectionId: z
        .string()
        .optional()
        .describe(
          'Collection ID (required for get/update/delete_collection, list/create_category, create_article, and list_articles unless categoryId is given)'
        ),
      categoryId: z
        .string()
        .optional()
        .describe(
          'Category ID (required for update/delete_category; list_articles uses it to list the articles in that category)'
        ),
      articleId: z.string().optional().describe('Article ID'),
      name: z.string().optional().describe('Name/title for create or update'),
      text: z.string().optional().describe('Article body text (HTML)'),
      description: z
        .string()
        .optional()
        .describe('Collection description (up to 45 characters)'),
      visibility: z
        .enum(['public', 'private'])
        .optional()
        .describe('Visibility for collections and categories'),
      status: z.enum(['published', 'notpublished']).optional().describe('Article status'),
      slug: z.string().optional().describe('URL slug for articles and categories'),
      categoryIds: z.array(z.string()).optional().describe('Category IDs for article'),
      order: z.number().optional().describe('Display order for collections and categories'),
      query: z.string().optional().describe('Search query (for search_articles)'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      sites: z
        .array(
          z.object({
            siteId: z.string(),
            title: z.string(),
            subDomain: z.string().optional()
          })
        )
        .optional(),
      collections: z
        .array(
          z.object({
            collectionId: z.string(),
            name: z.string(),
            visibility: z.string().optional(),
            articleCount: z.number().optional()
          })
        )
        .optional(),
      categories: z
        .array(
          z.object({
            categoryId: z.string(),
            name: z.string(),
            articleCount: z.number().optional(),
            order: z.number().optional()
          })
        )
        .optional(),
      articles: z
        .array(
          z.object({
            articleId: z.string(),
            name: z.string(),
            status: z.string().optional(),
            slug: z.string().optional(),
            publicUrl: z.string().optional()
          })
        )
        .optional(),
      article: z
        .object({
          articleId: z.string(),
          name: z.string(),
          text: z.string().optional(),
          status: z.string().optional(),
          slug: z.string().optional(),
          publicUrl: z.string().optional(),
          categories: z.array(z.string()).optional()
        })
        .optional(),
      collection: z
        .object({
          collectionId: z.string(),
          name: z.string(),
          visibility: z.string().optional()
        })
        .optional(),
      category: z
        .object({
          categoryId: z.string(),
          name: z.string(),
          collectionId: z.string().optional()
        })
        .optional()
        .describe('Single category (create_category, update_category)'),
      totalCount: z
        .number()
        .optional()
        .describe('Total matching items (list and search actions)'),
      currentPage: z.number().optional().describe('Current page (list and search actions)'),
      totalPages: z.number().optional().describe('Total pages (list and search actions)'),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.docsApiKey) {
      throw helpscoutServiceError(
        'Docs API key is not configured. Please set it during authentication setup.'
      );
    }

    let client = new DocsClient(ctx.auth.docsApiKey);

    switch (ctx.input.action) {
      case 'list_sites': {
        let data = await client.listSites({ page: ctx.input.page });
        let { items, ...page } = docsListInfo(data, 'sites');
        let sites = items.map((s: any) => ({
          siteId: s.id,
          title: s.title,
          subDomain: s.subDomain
        }));
        return {
          output: { sites, ...page, success: true },
          message: `Found **${page.totalCount}** Docs sites.`
        };
      }

      case 'list_collections': {
        let data = await client.listCollections({
          siteId: ctx.input.siteId,
          page: ctx.input.page
        });
        let { items, ...page } = docsListInfo(data, 'collections');
        let collections = items.map((c: any) => ({
          collectionId: c.id,
          name: c.name,
          visibility: c.visibility,
          articleCount: c.articleCount
        }));
        return {
          output: { collections, ...page, success: true },
          message: `Found **${page.totalCount}** collections.`
        };
      }

      case 'get_collection': {
        if (!ctx.input.collectionId) throw helpscoutServiceError('Collection ID is required');
        let data = await client.getCollection(ctx.input.collectionId);
        let c = data?.collection ?? data;
        return {
          output: {
            collection: { collectionId: c.id, name: c.name, visibility: c.visibility },
            success: true
          },
          message: `Collection **${c.name}**.`
        };
      }

      case 'create_collection': {
        if (!ctx.input.siteId || !ctx.input.name)
          throw helpscoutServiceError('Site ID and name are required');
        let data = await client.createCollection({
          siteId: ctx.input.siteId,
          name: ctx.input.name,
          visibility: ctx.input.visibility,
          description: ctx.input.description,
          order: ctx.input.order
        });
        let c = data?.collection ?? data;
        return {
          output: {
            collection: {
              collectionId: c?.id ?? '',
              name: c?.name ?? ctx.input.name,
              visibility: c?.visibility ?? ctx.input.visibility
            },
            success: true
          },
          message: `Created collection **"${ctx.input.name}"**.`
        };
      }

      case 'update_collection': {
        if (!ctx.input.collectionId) throw helpscoutServiceError('Collection ID is required');
        // PUT requires name and resets omitted visibility to public, so merge
        // the requested changes into the current collection.
        // https://developer.helpscout.com/docs-api/collections/update/
        let currentData = await client.getCollection(ctx.input.collectionId);
        let current = currentData?.collection ?? currentData ?? {};
        let data = await client.updateCollection(ctx.input.collectionId, {
          name: ctx.input.name ?? current.name,
          visibility: ctx.input.visibility ?? current.visibility,
          description: ctx.input.description ?? current.description ?? undefined,
          order: ctx.input.order ?? current.order
        });
        let c = data?.collection ?? {};
        return {
          output: {
            collection: {
              collectionId: c.id ?? ctx.input.collectionId,
              name: c.name ?? ctx.input.name ?? current.name,
              visibility: c.visibility ?? ctx.input.visibility ?? current.visibility
            },
            success: true
          },
          message: `Updated collection **#${ctx.input.collectionId}**.`
        };
      }

      case 'delete_collection': {
        if (!ctx.input.collectionId) throw helpscoutServiceError('Collection ID is required');
        await client.deleteCollection(ctx.input.collectionId);
        return {
          output: { success: true },
          message: `Deleted collection **#${ctx.input.collectionId}**.`
        };
      }

      case 'list_categories': {
        if (!ctx.input.collectionId) throw helpscoutServiceError('Collection ID is required');
        let data = await client.listCategories(ctx.input.collectionId, {
          page: ctx.input.page
        });
        let { items, ...page } = docsListInfo(data, 'categories');
        let categories = items.map((c: any) => ({
          categoryId: c.id,
          name: c.name,
          articleCount: c.articleCount,
          order: c.order
        }));
        return {
          output: { categories, ...page, success: true },
          message: `Found **${page.totalCount}** categories.`
        };
      }

      case 'create_category': {
        if (!ctx.input.collectionId || !ctx.input.name)
          throw helpscoutServiceError('Collection ID and name are required');
        let data = await client.createCategory({
          collectionId: ctx.input.collectionId,
          name: ctx.input.name,
          slug: ctx.input.slug,
          visibility: ctx.input.visibility,
          order: ctx.input.order
        });
        let c = data?.category ?? data ?? {};
        return {
          output: {
            category: c.id
              ? {
                  categoryId: c.id,
                  name: c.name ?? ctx.input.name,
                  collectionId: c.collectionId ?? ctx.input.collectionId
                }
              : undefined,
            success: true
          },
          message: `Created category **"${ctx.input.name}"**.`
        };
      }

      case 'update_category': {
        if (!ctx.input.categoryId) throw helpscoutServiceError('Category ID is required');
        // PUT requires name, so merge the requested changes into the current category.
        // https://developer.helpscout.com/docs-api/categories/update/
        let currentData = await client.getCategory(ctx.input.categoryId);
        let current = currentData?.category ?? currentData ?? {};
        let data = await client.updateCategory(ctx.input.categoryId, {
          name: ctx.input.name ?? current.name,
          slug: ctx.input.slug ?? current.slug ?? undefined,
          visibility: ctx.input.visibility ?? current.visibility ?? undefined,
          order: ctx.input.order ?? current.order,
          defaultSort: current.defaultSort ?? undefined
        });
        let c = data?.category ?? {};
        return {
          output: {
            category: {
              categoryId: c.id ?? ctx.input.categoryId,
              name: c.name ?? ctx.input.name ?? current.name,
              collectionId: c.collectionId ?? current.collectionId
            },
            success: true
          },
          message: `Updated category **#${ctx.input.categoryId}**.`
        };
      }

      case 'delete_category': {
        if (!ctx.input.categoryId) throw helpscoutServiceError('Category ID is required');
        await client.deleteCategory(ctx.input.categoryId);
        return {
          output: { success: true },
          message: `Deleted category **#${ctx.input.categoryId}**.`
        };
      }

      case 'list_articles': {
        if (!ctx.input.collectionId && !ctx.input.categoryId) {
          throw helpscoutServiceError('Collection ID or category ID is required');
        }
        let data = await client.listArticles(
          { collectionId: ctx.input.collectionId, categoryId: ctx.input.categoryId },
          {
            page: ctx.input.page,
            status: ctx.input.status
          }
        );
        let { items, ...page } = docsListInfo(data, 'articles');
        let articles = items.map((a: any) => ({
          articleId: a.id,
          name: a.name,
          status: a.status,
          slug: a.slug,
          publicUrl: a.publicUrl
        }));
        return {
          output: { articles, ...page, success: true },
          message: `Found **${page.totalCount}** articles.`
        };
      }

      case 'get_article': {
        if (!ctx.input.articleId) throw helpscoutServiceError('Article ID is required');
        let data = await client.getArticle(ctx.input.articleId);
        let a = data?.article ?? data;
        return {
          output: {
            article: {
              articleId: a.id,
              name: a.name,
              text: a.text,
              status: a.status,
              slug: a.slug,
              publicUrl: a.publicUrl,
              categories: a.categories
            },
            success: true
          },
          message: `Article **"${a.name}"**.`
        };
      }

      case 'create_article': {
        if (!ctx.input.collectionId || !ctx.input.name || !ctx.input.text) {
          throw helpscoutServiceError('Collection ID, name, and text are required');
        }
        let data = await client.createArticle({
          collectionId: ctx.input.collectionId,
          name: ctx.input.name,
          text: ctx.input.text,
          categories: ctx.input.categoryIds,
          status: ctx.input.status,
          slug: ctx.input.slug
        });
        let a = data?.article ?? data;
        return {
          output: {
            article: {
              articleId: a?.id ?? '',
              name: a?.name ?? ctx.input.name,
              status: a?.status ?? ctx.input.status,
              slug: a?.slug,
              publicUrl: a?.publicUrl,
              categories: a?.categories
            },
            success: true
          },
          message: `Created article **"${ctx.input.name}"**.`
        };
      }

      case 'update_article': {
        if (!ctx.input.articleId) throw helpscoutServiceError('Article ID is required');
        let data = await client.updateArticle(ctx.input.articleId, {
          name: ctx.input.name,
          text: ctx.input.text,
          categories: ctx.input.categoryIds,
          status: ctx.input.status,
          slug: ctx.input.slug
        });
        let a = data?.article;
        return {
          output: {
            article: a?.id
              ? {
                  articleId: a.id,
                  name: a.name,
                  status: a.status,
                  slug: a.slug,
                  publicUrl: a.publicUrl,
                  categories: a.categories
                }
              : undefined,
            success: true
          },
          message: `Updated article **#${ctx.input.articleId}**.`
        };
      }

      case 'delete_article': {
        if (!ctx.input.articleId) throw helpscoutServiceError('Article ID is required');
        await client.deleteArticle(ctx.input.articleId);
        return {
          output: { success: true },
          message: `Deleted article **#${ctx.input.articleId}**.`
        };
      }

      case 'search_articles': {
        if (!ctx.input.query) throw helpscoutServiceError('Search query is required');
        let data = await client.searchArticles(ctx.input.query, {
          collectionId: ctx.input.collectionId,
          siteId: ctx.input.siteId,
          page: ctx.input.page,
          status: ctx.input.status
        });
        let { items, ...page } = docsListInfo(data, 'articles');
        let articles = items.map((a: any) => ({
          articleId: a.id,
          name: a.name,
          status: a.status,
          slug: a.slug,
          publicUrl: a.url ?? a.publicUrl
        }));
        return {
          output: { articles, ...page, success: true },
          message: `Found **${page.totalCount}** articles matching "${ctx.input.query}".`
        };
      }

      default:
        throw helpscoutServiceError(`Unsupported knowledge base action: ${ctx.input.action}`);
    }
  })
  .build();

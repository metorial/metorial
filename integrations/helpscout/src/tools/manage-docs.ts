import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsClient } from '../lib/docs-client';
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
      siteId: z.string().optional().describe('Site ID (for listing collections)'),
      collectionId: z.string().optional().describe('Collection ID'),
      categoryId: z.string().optional().describe('Category ID'),
      articleId: z.string().optional().describe('Article ID'),
      name: z.string().optional().describe('Name/title for create or update'),
      text: z.string().optional().describe('Article body text (HTML)'),
      description: z.string().optional().describe('Description for collection or category'),
      visibility: z
        .enum(['public', 'private'])
        .optional()
        .describe('Visibility for collections'),
      status: z.enum(['published', 'notpublished']).optional().describe('Article status'),
      slug: z.string().optional().describe('Article URL slug'),
      categoryIds: z.array(z.string()).optional().describe('Category IDs for article'),
      order: z.number().optional().describe('Sort order for categories'),
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
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.docsApiKey) {
      throw new Error(
        'Docs API key is not configured. Please set it during authentication setup.'
      );
    }

    let client = new DocsClient(ctx.auth.docsApiKey);

    switch (ctx.input.action) {
      case 'list_sites': {
        let data = await client.listSites({ page: ctx.input.page });
        let sites = (data?.sites?.items ?? data?.items ?? []).map((s: any) => ({
          siteId: s.id,
          title: s.title,
          subDomain: s.subDomain
        }));
        return {
          output: { sites, success: true },
          message: `Found **${sites.length}** Docs sites.`
        };
      }

      case 'list_collections': {
        if (!ctx.input.siteId) throw new Error('Site ID is required');
        let data = await client.listCollections(ctx.input.siteId, { page: ctx.input.page });
        let collections = (data?.collections?.items ?? data?.items ?? []).map((c: any) => ({
          collectionId: c.id,
          name: c.name,
          visibility: c.visibility,
          articleCount: c.articleCount
        }));
        return {
          output: { collections, success: true },
          message: `Found **${collections.length}** collections.`
        };
      }

      case 'get_collection': {
        if (!ctx.input.collectionId) throw new Error('Collection ID is required');
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
          throw new Error('Site ID and name are required');
        let data = await client.createCollection({
          siteId: ctx.input.siteId,
          name: ctx.input.name,
          visibility: ctx.input.visibility,
          description: ctx.input.description
        });
        let c = data?.collection ?? data;
        return {
          output: {
            collection: {
              collectionId: c?.id ?? '',
              name: ctx.input.name,
              visibility: ctx.input.visibility
            },
            success: true
          },
          message: `Created collection **"${ctx.input.name}"**.`
        };
      }

      case 'update_collection': {
        if (!ctx.input.collectionId) throw new Error('Collection ID is required');
        await client.updateCollection(ctx.input.collectionId, {
          name: ctx.input.name,
          visibility: ctx.input.visibility,
          description: ctx.input.description
        });
        return {
          output: { success: true },
          message: `Updated collection **#${ctx.input.collectionId}**.`
        };
      }

      case 'delete_collection': {
        if (!ctx.input.collectionId) throw new Error('Collection ID is required');
        await client.deleteCollection(ctx.input.collectionId);
        return {
          output: { success: true },
          message: `Deleted collection **#${ctx.input.collectionId}**.`
        };
      }

      case 'list_categories': {
        if (!ctx.input.collectionId) throw new Error('Collection ID is required');
        let data = await client.listCategories(ctx.input.collectionId, {
          page: ctx.input.page
        });
        let categories = (data?.categories?.items ?? data?.items ?? []).map((c: any) => ({
          categoryId: c.id,
          name: c.name,
          articleCount: c.articleCount,
          order: c.order
        }));
        return {
          output: { categories, success: true },
          message: `Found **${categories.length}** categories.`
        };
      }

      case 'create_category': {
        if (!ctx.input.collectionId || !ctx.input.name)
          throw new Error('Collection ID and name are required');
        await client.createCategory(ctx.input.collectionId, {
          name: ctx.input.name,
          description: ctx.input.description,
          order: ctx.input.order
        });
        return {
          output: { success: true },
          message: `Created category **"${ctx.input.name}"**.`
        };
      }

      case 'update_category': {
        if (!ctx.input.categoryId) throw new Error('Category ID is required');
        await client.updateCategory(ctx.input.categoryId, {
          name: ctx.input.name,
          description: ctx.input.description,
          order: ctx.input.order
        });
        return {
          output: { success: true },
          message: `Updated category **#${ctx.input.categoryId}**.`
        };
      }

      case 'delete_category': {
        if (!ctx.input.categoryId) throw new Error('Category ID is required');
        await client.deleteCategory(ctx.input.categoryId);
        return {
          output: { success: true },
          message: `Deleted category **#${ctx.input.categoryId}**.`
        };
      }

      case 'list_articles': {
        if (!ctx.input.collectionId) throw new Error('Collection ID is required');
        let data = await client.listArticles(ctx.input.collectionId, {
          page: ctx.input.page,
          status: ctx.input.status,
          categoryId: ctx.input.categoryId
        });
        let articles = (data?.articles?.items ?? data?.items ?? []).map((a: any) => ({
          articleId: a.id,
          name: a.name,
          status: a.status,
          slug: a.slug,
          publicUrl: a.publicUrl
        }));
        return {
          output: { articles, success: true },
          message: `Found **${articles.length}** articles.`
        };
      }

      case 'get_article': {
        if (!ctx.input.articleId) throw new Error('Article ID is required');
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
          throw new Error('Collection ID, name, and text are required');
        }
        let data = await client.createArticle(ctx.input.collectionId, {
          name: ctx.input.name,
          text: ctx.input.text,
          categoryIds: ctx.input.categoryIds,
          status: ctx.input.status,
          slug: ctx.input.slug
        });
        let a = data?.article ?? data;
        return {
          output: {
            article: {
              articleId: a?.id ?? '',
              name: ctx.input.name,
              status: ctx.input.status
            },
            success: true
          },
          message: `Created article **"${ctx.input.name}"**.`
        };
      }

      case 'update_article': {
        if (!ctx.input.articleId) throw new Error('Article ID is required');
        await client.updateArticle(ctx.input.articleId, {
          name: ctx.input.name,
          text: ctx.input.text,
          categoryIds: ctx.input.categoryIds,
          status: ctx.input.status,
          slug: ctx.input.slug
        });
        return {
          output: { success: true },
          message: `Updated article **#${ctx.input.articleId}**.`
        };
      }

      case 'delete_article': {
        if (!ctx.input.articleId) throw new Error('Article ID is required');
        await client.deleteArticle(ctx.input.articleId);
        return {
          output: { success: true },
          message: `Deleted article **#${ctx.input.articleId}**.`
        };
      }

      case 'search_articles': {
        if (!ctx.input.query) throw new Error('Search query is required');
        let data = await client.searchArticles(ctx.input.query, {
          collectionId: ctx.input.collectionId,
          page: ctx.input.page,
          status: ctx.input.status
        });
        let articles = (data?.articles?.items ?? data?.items ?? []).map((a: any) => ({
          articleId: a.id,
          name: a.name,
          status: a.status,
          slug: a.slug,
          publicUrl: a.publicUrl
        }));
        return {
          output: { articles, success: true },
          message: `Found **${articles.length}** articles matching "${ctx.input.query}".`
        };
      }

      default:
        return { output: { success: false }, message: 'Unknown action.' };
    }
  })
  .build();

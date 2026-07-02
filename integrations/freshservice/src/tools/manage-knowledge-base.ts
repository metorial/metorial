import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listKnowledgeBaseArticles = SlateTool.create(spec, {
  name: 'List Knowledge Base Articles',
  key: 'list_knowledge_base_articles',
  description: `List knowledge base articles from a specific folder. To discover folders, first list categories, then list folders within a category.`,
  instructions: [
    'Use listKnowledgeBaseCategories first to find category IDs, then get folders within a category to find folder IDs.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z.number().describe('ID of the solution folder to list articles from'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      articles: z.array(
        z.object({
          articleId: z.number().describe('Article ID'),
          title: z.string().describe('Article title'),
          status: z.number().describe('Status: 1=Draft, 2=Published'),
          articleType: z.number().nullable().describe('Article type'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let result = await client.listSolutionArticles(ctx.input.folderId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let articles = result.articles.map((a: Record<string, unknown>) => ({
      articleId: a.id as number,
      title: a.title as string,
      status: a.status as number,
      articleType: a.article_type as number | null,
      createdAt: a.created_at as string,
      updatedAt: a.updated_at as string
    }));

    return {
      output: { articles },
      message: `Found **${articles.length}** articles in folder #${ctx.input.folderId}`
    };
  })
  .build();

export let getKnowledgeBaseArticle = SlateTool.create(spec, {
  name: 'Get Knowledge Base Article',
  key: 'get_knowledge_base_article',
  description: `Retrieve a single knowledge base article by its ID with full content.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      articleId: z.number().describe('ID of the article')
    })
  )
  .output(
    z.object({
      articleId: z.number().describe('Article ID'),
      title: z.string().describe('Article title'),
      description: z.string().nullable().describe('HTML content of the article'),
      status: z.number().describe('Status: 1=Draft, 2=Published'),
      articleType: z.number().nullable().describe('Article type'),
      folderId: z.number().describe('Folder ID'),
      categoryId: z.number().nullable().describe('Category ID'),
      tags: z.array(z.string()).nullable().describe('Tags'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let article = await client.getSolutionArticle(ctx.input.articleId);

    return {
      output: {
        articleId: article.id,
        title: article.title,
        description: article.description,
        status: article.status,
        articleType: article.article_type,
        folderId: article.folder_id,
        categoryId: article.category_id,
        tags: article.tags,
        createdAt: article.created_at,
        updatedAt: article.updated_at
      },
      message: `Retrieved article **#${article.id}**: "${article.title}"`
    };
  })
  .build();

export let createKnowledgeBaseArticle = SlateTool.create(spec, {
  name: 'Create Knowledge Base Article',
  key: 'create_knowledge_base_article',
  description: `Create a new knowledge base article in a specific folder.

Status: 1=Draft, 2=Published.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      folderId: z.number().describe('ID of the folder to create the article in'),
      title: z.string().describe('Article title'),
      description: z.string().optional().describe('HTML content of the article'),
      status: z.number().optional().describe('Status: 1=Draft (default), 2=Published'),
      tags: z.array(z.string()).optional().describe('Tags for the article')
    })
  )
  .output(
    z.object({
      articleId: z.number().describe('ID of the created article'),
      title: z.string().describe('Title'),
      status: z.number().describe('Status'),
      folderId: z.number().describe('Folder ID'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let article = await client.createSolutionArticle(ctx.input.folderId, {
      title: ctx.input.title,
      description: ctx.input.description,
      status: ctx.input.status,
      tags: ctx.input.tags
    });

    return {
      output: {
        articleId: article.id,
        title: article.title,
        status: article.status,
        folderId: article.folder_id,
        createdAt: article.created_at
      },
      message: `Created article **#${article.id}**: "${article.title}"`
    };
  })
  .build();

export let updateKnowledgeBaseArticle = SlateTool.create(spec, {
  name: 'Update Knowledge Base Article',
  key: 'update_knowledge_base_article',
  description: `Update a knowledge base article's title, content, status, or tags.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      articleId: z.number().describe('ID of the article to update'),
      title: z.string().optional().describe('Updated title'),
      description: z.string().optional().describe('Updated HTML content'),
      status: z.number().optional().describe('Status: 1=Draft, 2=Published'),
      tags: z.array(z.string()).optional().describe('Updated tags')
    })
  )
  .output(
    z.object({
      articleId: z.number().describe('Article ID'),
      title: z.string().describe('Title'),
      status: z.number().describe('Status'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let { articleId, ...updateParams } = ctx.input;
    let article = await client.updateSolutionArticle(articleId, updateParams);

    return {
      output: {
        articleId: article.id,
        title: article.title,
        status: article.status,
        updatedAt: article.updated_at
      },
      message: `Updated article **#${article.id}**: "${article.title}"`
    };
  })
  .build();

export let listKnowledgeBaseCategories = SlateTool.create(spec, {
  name: 'List Knowledge Base Categories',
  key: 'list_knowledge_base_categories',
  description: `List all knowledge base (solution) categories. Use this to discover available categories and then list folders within each.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      categories: z.array(
        z.object({
          categoryId: z.number().describe('Category ID'),
          name: z.string().describe('Category name'),
          description: z.string().nullable().describe('Description'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let result = await client.listSolutionCategories({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let categories = result.categories.map((c: Record<string, unknown>) => ({
      categoryId: c.id as number,
      name: c.name as string,
      description: c.description as string | null,
      createdAt: c.created_at as string,
      updatedAt: c.updated_at as string
    }));

    return {
      output: { categories },
      message: `Found **${categories.length}** knowledge base categories`
    };
  })
  .build();

export let listKnowledgeBaseFolders = SlateTool.create(spec, {
  name: 'List Knowledge Base Folders',
  key: 'list_knowledge_base_folders',
  description: `List all folders within a knowledge base category. Each folder contains articles.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      categoryId: z.number().describe('ID of the category to list folders from'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      folders: z.array(
        z.object({
          folderId: z.number().describe('Folder ID'),
          name: z.string().describe('Folder name'),
          description: z.string().nullable().describe('Description'),
          categoryId: z.number().describe('Parent category ID'),
          articlesCount: z.number().nullable().describe('Number of articles'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let result = await client.listSolutionFolders(ctx.input.categoryId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let folders = result.folders.map((f: Record<string, unknown>) => ({
      folderId: f.id as number,
      name: f.name as string,
      description: f.description as string | null,
      categoryId: f.category_id as number,
      articlesCount: f.articles_count as number | null,
      createdAt: f.created_at as string,
      updatedAt: f.updated_at as string
    }));

    return {
      output: { folders },
      message: `Found **${folders.length}** folders in category #${ctx.input.categoryId}`
    };
  })
  .build();

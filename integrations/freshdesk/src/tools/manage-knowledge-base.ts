import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let listKnowledgeBase = SlateTool.create(spec, {
  name: 'List Knowledge Base',
  key: 'list_knowledge_base',
  description: `Browses the knowledge base hierarchy. Lists categories, or folders within a category, or articles within a folder depending on the parameters provided.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      categoryId: z
        .number()
        .optional()
        .describe(
          'If provided, lists folders within this category. If omitted, lists all categories.'
        ),
      folderId: z
        .number()
        .optional()
        .describe(
          'If provided, lists articles within this folder. Requires categoryId to be omitted.'
        )
    })
  )
  .output(
    z.object({
      categories: z
        .array(
          z.object({
            categoryId: z.number().describe('Category ID'),
            name: z.string().describe('Category name'),
            description: z.string().nullable().describe('Category description')
          })
        )
        .optional()
        .describe('Solution categories (when listing categories)'),
      folders: z
        .array(
          z.object({
            folderId: z.number().describe('Folder ID'),
            name: z.string().describe('Folder name'),
            description: z.string().nullable().describe('Folder description'),
            visibility: z
              .number()
              .nullable()
              .describe('Visibility: 1=All, 2=Logged-in, 3=Agents, 4=Selected companies'),
            articlesCount: z.number().nullable().describe('Number of articles in the folder')
          })
        )
        .optional()
        .describe('Solution folders (when listing folders in a category)'),
      articles: z
        .array(
          z.object({
            articleId: z.number().describe('Article ID'),
            title: z.string().describe('Article title'),
            status: z.number().describe('Status: 1=Draft, 2=Published'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .optional()
        .describe('Solution articles (when listing articles in a folder)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    if (ctx.input.folderId) {
      let articles = await client.listSolutionArticles(ctx.input.folderId);
      let mapped = articles.map((a: any) => ({
        articleId: a.id,
        title: a.title,
        status: a.status,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      }));
      return {
        output: { articles: mapped },
        message: `Retrieved **${mapped.length}** articles from folder #${ctx.input.folderId}`
      };
    }

    if (ctx.input.categoryId) {
      let folders = await client.listSolutionFolders(ctx.input.categoryId);
      let mapped = folders.map((f: any) => ({
        folderId: f.id,
        name: f.name,
        description: f.description ?? null,
        visibility: f.visibility ?? null,
        articlesCount: f.articles_count ?? null
      }));
      return {
        output: { folders: mapped },
        message: `Retrieved **${mapped.length}** folders from category #${ctx.input.categoryId}`
      };
    }

    let categories = await client.listSolutionCategories();
    let mapped = categories.map((c: any) => ({
      categoryId: c.id,
      name: c.name,
      description: c.description ?? null
    }));
    return {
      output: { categories: mapped },
      message: `Retrieved **${mapped.length}** knowledge base categories`
    };
  })
  .build();

export let getArticle = SlateTool.create(spec, {
  name: 'Get Article',
  key: 'get_article',
  description: `Retrieves a single knowledge base article by ID, including full HTML content, SEO metadata, tags, and folder/category information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      articleId: z.number().describe('ID of the article to retrieve')
    })
  )
  .output(
    z.object({
      articleId: z.number().describe('Article ID'),
      title: z.string().describe('Article title'),
      description: z.string().nullable().describe('Full HTML content of the article'),
      descriptionText: z.string().nullable().describe('Plain text content'),
      status: z.number().describe('Status: 1=Draft, 2=Published'),
      folderId: z.number().describe('Parent folder ID'),
      categoryId: z.number().describe('Parent category ID'),
      tags: z.array(z.string()).describe('Article tags'),
      seoTitle: z.string().nullable().describe('SEO title'),
      seoDescription: z.string().nullable().describe('SEO meta description'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let article = await client.getSolutionArticle(ctx.input.articleId);

    return {
      output: {
        articleId: article.id,
        title: article.title,
        description: article.description ?? null,
        descriptionText: article.description_text ?? null,
        status: article.status,
        folderId: article.folder_id,
        categoryId: article.category_id,
        tags: article.tags ?? [],
        seoTitle: article.seo_data?.meta_title ?? null,
        seoDescription: article.seo_data?.meta_description ?? null,
        createdAt: article.created_at,
        updatedAt: article.updated_at
      },
      message: `Retrieved article **"${article.title}"** (ID: ${article.id})`
    };
  })
  .build();

export let createArticle = SlateTool.create(spec, {
  name: 'Create Article',
  key: 'create_article',
  description: `Creates a new knowledge base article in a specified folder. Supports HTML content, tags, SEO metadata, and draft/published status.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      folderId: z.number().describe('ID of the folder to create the article in'),
      title: z.string().describe('Article title'),
      description: z.string().describe('HTML content of the article'),
      status: z
        .number()
        .optional()
        .describe('Status: 1=Draft, 2=Published. Defaults to 1 (Draft).'),
      tags: z.array(z.string()).optional().describe('Tags for the article'),
      seoTitle: z.string().optional().describe('SEO title'),
      seoDescription: z.string().optional().describe('SEO meta description')
    })
  )
  .output(
    z.object({
      articleId: z.number().describe('ID of the created article'),
      title: z.string().describe('Article title'),
      status: z.number().describe('Article status'),
      folderId: z.number().describe('Parent folder ID'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let articleData: Record<string, any> = {
      title: ctx.input.title,
      description: ctx.input.description
    };

    if (ctx.input.status !== undefined) articleData.status = ctx.input.status;
    if (ctx.input.tags) articleData.tags = ctx.input.tags;
    if (ctx.input.seoTitle || ctx.input.seoDescription) {
      articleData.seo_data = {};
      if (ctx.input.seoTitle) articleData.seo_data.meta_title = ctx.input.seoTitle;
      if (ctx.input.seoDescription)
        articleData.seo_data.meta_description = ctx.input.seoDescription;
    }

    let article = await client.createSolutionArticle(ctx.input.folderId, articleData);

    return {
      output: {
        articleId: article.id,
        title: article.title,
        status: article.status,
        folderId: article.folder_id,
        createdAt: article.created_at
      },
      message: `Created article **"${article.title}"** (ID: ${article.id})`
    };
  })
  .build();

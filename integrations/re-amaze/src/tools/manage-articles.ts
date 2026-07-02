import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let articleSchema = z.object({
  slug: z.string().optional().describe('Article slug identifier'),
  title: z.string().describe('Article title'),
  articleBody: z.string().optional().describe('Article content'),
  status: z.number().describe('Status: 0=Published, 1=Draft, 4=Internal'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().optional().describe('ISO 8601 last update timestamp'),
  url: z.string().optional().describe('Public URL of the article'),
  authorName: z.string().nullable().optional().describe('Author name'),
  authorEmail: z.string().nullable().optional().describe('Author email'),
  topicName: z.string().nullable().optional().describe('Topic name the article belongs to'),
  topicSlug: z.string().nullable().optional().describe('Topic slug')
});

export let listArticles = SlateTool.create(spec, {
  name: 'List Articles',
  key: 'list_articles',
  description: `List and search knowledge base articles. Filter by status (published, draft, internal), search by keyword, or scope to a specific topic.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['published', 'draft', 'internal'])
        .optional()
        .describe('Filter articles by publication status'),
      query: z.string().optional().describe('Keyword search query'),
      topicSlug: z
        .string()
        .optional()
        .describe('Topic slug to scope articles to a specific topic'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      pageSize: z.number().describe('Number of items per page'),
      pageCount: z.number().describe('Total number of pages'),
      totalCount: z.number().describe('Total number of matching articles'),
      articles: z.array(articleSchema).describe('List of articles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.listArticles({
      status: ctx.input.status,
      q: ctx.input.query,
      topicSlug: ctx.input.topicSlug,
      page: ctx.input.page
    });

    let articles = (result.articles || []).map((a: any) => ({
      slug: a.slug,
      title: a.title,
      articleBody: a.body,
      status: a.status,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
      url: a.url,
      authorName: a.author?.name,
      authorEmail: a.author?.email,
      topicName: a.topic?.name,
      topicSlug: a.topic?.slug
    }));

    return {
      output: {
        pageSize: result.page_size,
        pageCount: result.page_count,
        totalCount: result.total_count,
        articles
      },
      message: `Found **${result.total_count}** articles.`
    };
  })
  .build();

export let createArticle = SlateTool.create(spec, {
  name: 'Create Article',
  key: 'create_article',
  description: `Create a new knowledge base / FAQ article. Set the title, body content, publication status, and optionally assign it to a topic.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Article title'),
      articleBody: z.string().describe('Article content (HTML supported)'),
      status: z.enum(['published', 'draft', 'internal']).describe('Publication status'),
      topicSlug: z.string().optional().describe('Topic slug to assign the article to')
    })
  )
  .output(articleSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let statusMap: Record<string, number> = { published: 0, draft: 1, internal: 4 };

    let result = await client.createArticle({
      title: ctx.input.title,
      body: ctx.input.articleBody,
      status: statusMap[ctx.input.status]!,
      topicId: ctx.input.topicSlug
    });

    let a = result.article || result;

    return {
      output: {
        slug: a.slug,
        title: a.title,
        articleBody: a.body,
        status: a.status,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        url: a.url,
        authorName: a.author?.name,
        authorEmail: a.author?.email,
        topicName: a.topic?.name,
        topicSlug: a.topic?.slug
      },
      message: `Created article **${a.title}**.`
    };
  })
  .build();

export let updateArticle = SlateTool.create(spec, {
  name: 'Update Article',
  key: 'update_article',
  description: `Update an existing knowledge base article's title, body, status, or topic assignment.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      articleSlug: z.string().describe('The slug identifier of the article to update'),
      title: z.string().optional().describe('Updated article title'),
      articleBody: z.string().optional().describe('Updated article content'),
      status: z
        .enum(['published', 'draft', 'internal'])
        .optional()
        .describe('Updated publication status'),
      topicSlug: z.string().optional().describe('Move article to a different topic by slug')
    })
  )
  .output(articleSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let statusMap: Record<string, number> = { published: 0, draft: 1, internal: 4 };

    let result = await client.updateArticle(ctx.input.articleSlug, {
      title: ctx.input.title,
      body: ctx.input.articleBody,
      status: ctx.input.status ? statusMap[ctx.input.status] : undefined,
      topicId: ctx.input.topicSlug
    });

    let a = result.article || result;

    return {
      output: {
        slug: a.slug,
        title: a.title,
        articleBody: a.body,
        status: a.status,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        url: a.url,
        authorName: a.author?.name,
        authorEmail: a.author?.email,
        topicName: a.topic?.name,
        topicSlug: a.topic?.slug
      },
      message: `Updated article **${a.title || ctx.input.articleSlug}**.`
    };
  })
  .build();

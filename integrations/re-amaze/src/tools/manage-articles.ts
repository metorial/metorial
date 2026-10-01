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
  instructions: [
    'If combining query and topicSlug returns no articles, search without topicSlug and inspect the topicSlug on each result. Topic-scoped keyword searches can omit matching articles.'
  ],
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
      page: z.number().int().min(1).optional().describe('Page number for pagination')
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

    let articles = (result.articles || []).map(mapArticle);

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

export let getArticle = SlateTool.create(spec, {
  name: 'Get Article',
  key: 'get_article',
  description:
    'Retrieve a knowledge base article by its slug, including its content, publication status, author, and topic. Call list_articles to discover article slugs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      articleSlug: z
        .string()
        .min(1)
        .describe('Article slug. Call list_articles to find article slugs.')
    })
  )
  .output(articleSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });
    let result = await client.getArticle(ctx.input.articleSlug);
    let article = result.article || result;

    return {
      output: mapArticle(article),
      message: `Retrieved article **${article.title}**.`
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
      output: mapArticle(a),
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
    // Updates can return only the slug. Read the persisted article for the full output.
    if (typeof a.title !== 'string' || typeof a.status !== 'number') {
      let current = await client.getArticle(a.slug || ctx.input.articleSlug);
      a = current.article || current;
    }

    return {
      output: mapArticle(a),
      message: `Updated article **${a.title || ctx.input.articleSlug}**.`
    };
  })
  .build();

let mapArticle = (article: any) => ({
  slug: article.slug,
  title: article.title,
  articleBody: article.body,
  status: article.status,
  createdAt: article.created_at,
  updatedAt: article.updated_at,
  url: article.url,
  authorName: article.author?.name,
  authorEmail: article.author?.email,
  topicName: article.topic?.name,
  topicSlug: article.topic?.slug
});

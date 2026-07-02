import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listKnowledgeBases = SlateTool.create(spec, {
  name: 'List Knowledge Bases',
  key: 'list_knowledge_bases',
  description: `List all knowledge bases in Front. Knowledge bases contain organized articles and categories for self-service support.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      knowledgeBases: z.array(
        z.object({
          knowledgeBaseId: z.string(),
          name: z.string(),
          status: z.string(),
          type: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listKnowledgeBases();

    let knowledgeBases = result._results.map(kb => ({
      knowledgeBaseId: kb.id,
      name: kb.name,
      status: kb.status,
      type: kb.type
    }));

    return {
      output: { knowledgeBases },
      message: `Found **${knowledgeBases.length}** knowledge bases.`
    };
  });

export let getKnowledgeBaseContent = SlateTool.create(spec, {
  name: 'Get Knowledge Base Content',
  key: 'get_knowledge_base_content',
  description: `Retrieve the categories and articles within a specific knowledge base. Useful for browsing available help content or finding specific articles.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      knowledgeBaseId: z.string().describe('ID of the knowledge base'),
      includeArticles: z.boolean().optional().describe('Whether to also list articles')
    })
  )
  .output(
    z.object({
      knowledgeBase: z.object({
        knowledgeBaseId: z.string(),
        name: z.string(),
        status: z.string(),
        type: z.string()
      }),
      categories: z.array(
        z.object({
          categoryId: z.string(),
          name: z.string(),
          description: z.string().optional(),
          locale: z.string().optional()
        })
      ),
      articles: z
        .array(
          z.object({
            articleId: z.string(),
            name: z.string(),
            status: z.string(),
            subject: z.string().optional(),
            locale: z.string().optional(),
            createdAt: z.number(),
            updatedAt: z.number()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let kb = await client.getKnowledgeBase(ctx.input.knowledgeBaseId);
    let catResult = await client.listKnowledgeBaseCategories(ctx.input.knowledgeBaseId);

    let categories = catResult._results.map(c => ({
      categoryId: c.id,
      name: c.name,
      description: c.description,
      locale: c.locale
    }));

    let articles: any;
    if (ctx.input.includeArticles) {
      let artResult = await client.listKnowledgeBaseArticles(ctx.input.knowledgeBaseId);
      articles = artResult._results.map(a => ({
        articleId: a.id,
        name: a.name,
        status: a.status,
        subject: a.subject,
        locale: a.locale,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      }));
    }

    return {
      output: {
        knowledgeBase: {
          knowledgeBaseId: kb.id,
          name: kb.name,
          status: kb.status,
          type: kb.type
        },
        categories,
        articles
      },
      message: `Knowledge base **${kb.name}**: ${categories.length} categories${articles ? `, ${articles.length} articles` : ''}.`
    };
  });

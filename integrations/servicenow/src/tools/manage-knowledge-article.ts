import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageKnowledgeArticle = SlateTool.create(spec, {
  name: 'Manage Knowledge Article',
  key: 'manage_knowledge_article',
  description: `Create, update, or search knowledge base articles in ServiceNow. Use the search action to find articles by keyword, or create/update articles with title, body, and metadata.`
})
  .input(
    z.object({
      action: z.enum(['search', 'create', 'update']).describe('Action to perform'),
      searchQuery: z
        .string()
        .optional()
        .describe('Search text to find articles (required for search action)'),
      articleId: z
        .string()
        .optional()
        .describe('sys_id of the article to update (required for update action)'),
      shortDescription: z.string().optional().describe('Article title/short description'),
      text: z.string().optional().describe('Article body content (HTML supported)'),
      knowledgeBaseId: z.string().optional().describe('sys_id of the knowledge base'),
      category: z.string().optional().describe('Article category'),
      workflowState: z
        .enum(['draft', 'review', 'published', 'retired'])
        .optional()
        .describe('Publishing workflow state'),
      limit: z.number().optional().default(20).describe('Maximum results for search')
    })
  )
  .output(
    z.object({
      articles: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Search results (for search action)'),
      record: z
        .record(z.string(), z.any())
        .optional()
        .describe('The created or updated article (for create/update actions)'),
      articleId: z.string().optional().describe('sys_id of the created/updated article')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    if (ctx.input.action === 'search') {
      if (!ctx.input.searchQuery) {
        throw new Error('searchQuery is required for search action');
      }
      let articles = await client.searchKnowledge({
        query: ctx.input.searchQuery,
        limit: ctx.input.limit,
        knowledgeBaseId: ctx.input.knowledgeBaseId
      });

      return {
        output: { articles },
        message: `Found **${articles.length}** knowledge articles matching "${ctx.input.searchQuery}".`
      };
    }

    let fields: Record<string, any> = {};
    if (ctx.input.shortDescription) fields.short_description = ctx.input.shortDescription;
    if (ctx.input.text) fields.text = ctx.input.text;
    if (ctx.input.knowledgeBaseId) fields.kb_knowledge_base = ctx.input.knowledgeBaseId;
    if (ctx.input.category) fields.kb_category = ctx.input.category;
    if (ctx.input.workflowState) fields.workflow_state = ctx.input.workflowState;

    if (ctx.input.action === 'create') {
      let record = await client.createKnowledgeArticle(fields);
      return {
        output: {
          record,
          articleId: record.sys_id
        },
        message: `Created knowledge article **${record.number || record.sys_id}**: ${record.short_description || 'No title'}`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.articleId) {
        throw new Error('articleId is required for update action');
      }
      let record = await client.updateKnowledgeArticle(ctx.input.articleId, fields);
      return {
        output: {
          record,
          articleId: record.sys_id
        },
        message: `Updated knowledge article **${record.number || record.sys_id}**: ${record.short_description || 'No title'}`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();

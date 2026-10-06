import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const manageKnowledgeBaseSource = SlateTool.create(spec, {
  name: 'Manage Knowledge Base Source',
  key: 'manage_knowledge_base_source',
  description:
    'List, add, update, or delete content sources in a knowledge base. Add plain text, a website URL, or a hosted PDF so agents can answer questions about your content.'
})
  .input(
    z.object({
      operation: z.enum(['list', 'add', 'update', 'delete']).describe('Operation to perform'),
      knowledgeBaseId: z
        .string()
        .min(1)
        .describe('Knowledge base ID from manage_knowledge_base (create/list)'),
      sourceId: z
        .string()
        .min(1)
        .optional()
        .describe('Source ID from list/add; required for update/delete'),
      name: z
        .string()
        .optional()
        .describe('Source name (add/update) or source name search (list)'),
      type: z
        .enum(['text', 'web', 'pdf'])
        .optional()
        .describe('Source type; required for add'),
      content: z
        .string()
        .optional()
        .describe(
          'Full text content; required for add with type text or update of an existing text source'
        ),
      url: z
        .string()
        .url()
        .optional()
        .describe(
          'Hosted PDF or website URL; required for add with type pdf/web or update of an existing web/PDF source'
        ),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Sources per page (list; default 20)'),
      offset: z.number().int().nonnegative().optional().describe('Sources to skip (list)')
    })
  )
  .output(
    z.object({
      knowledgeBaseId: z.string(),
      sourceId: z.string().optional(),
      sources: z.array(z.record(z.string(), z.any())).optional(),
      totalRecords: z.number().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { knowledgeBaseId, operation } = ctx.input;
    if (operation === 'list') {
      let result = await client.listKnowledgeBaseSources(
        knowledgeBaseId,
        pickDefined({ name: ctx.input.name, limit: ctx.input.limit, offset: ctx.input.offset })
      );
      let sources = result.response?.sources ?? [];
      return {
        output: { knowledgeBaseId, sources, totalRecords: result.response?.total_records },
        message: `Found ${sources.length} knowledge base source(s).`
      };
    }
    if (operation === 'delete') {
      if (!ctx.input.sourceId)
        throw createApiServiceError('sourceId is required to delete a knowledge base source.');
      await client.deleteKnowledgeBaseSource(knowledgeBaseId, ctx.input.sourceId);
      return {
        output: { knowledgeBaseId, sourceId: ctx.input.sourceId, deleted: true },
        message: `Deleted knowledge base source \`${ctx.input.sourceId}\`.`
      };
    }
    if (operation === 'update') {
      if (!ctx.input.sourceId)
        throw createApiServiceError('sourceId is required to update a knowledge base source.');
      if (ctx.input.type !== undefined)
        throw createApiServiceError(
          'Source type cannot be changed. Omit type and provide content for an existing text source, or url for an existing web/PDF source.'
        );
      if ((ctx.input.content !== undefined) === (ctx.input.url !== undefined))
        throw createApiServiceError(
          'Provide exactly one of content or url when updating a source. Use the existing source type from list.'
        );
      if (ctx.input.content !== undefined && !ctx.input.content.trim())
        throw createApiServiceError('Provide non-empty content when updating a text source.');
      await client.updateKnowledgeBaseSource(
        knowledgeBaseId,
        ctx.input.sourceId,
        pickDefined({ name: ctx.input.name, content: ctx.input.content, url: ctx.input.url })
      );
      return {
        output: { knowledgeBaseId, sourceId: ctx.input.sourceId },
        message: `Updated knowledge base source \`${ctx.input.sourceId}\`.`
      };
    }
    if (!ctx.input.type)
      throw createApiServiceError('type is required to add a knowledge base source.');
    if (ctx.input.type === 'text' && !ctx.input.content?.trim())
      throw createApiServiceError('content is required for a text source.');
    if (ctx.input.type !== 'text' && !ctx.input.url)
      throw createApiServiceError('url is required for a web or PDF source.');
    if (
      (ctx.input.type === 'text' && ctx.input.url !== undefined) ||
      (ctx.input.type !== 'text' && ctx.input.content !== undefined)
    )
      throw createApiServiceError('Use content for text sources, or url for web/PDF sources.');
    let result = await client.addKnowledgeBaseSource(
      knowledgeBaseId,
      pickDefined({
        name: ctx.input.name,
        type: ctx.input.type,
        content: ctx.input.content,
        url: ctx.input.url
      })
    );
    if (!result.response?.source_id)
      throw createApiServiceError('Synthflow did not return the created source ID.');
    return {
      output: { knowledgeBaseId, sourceId: result.response.source_id },
      message: `Added ${ctx.input.type} source \`${result.response.source_id}\`.`
    };
  })
  .build();

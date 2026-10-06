import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageKnowledgeBase = SlateTool.create(spec, {
  name: 'Manage Knowledge Base',
  key: 'manage_knowledge_base',
  description: `Create, list, retrieve, update, delete, attach, or detach knowledge bases. Add domain content with manage_knowledge_base_source, then attach the knowledge base to an agent for use during calls.`,
  instructions: [
    'Use operation "create" to create a new knowledge base.',
    'Use operation "get" to retrieve a knowledge base by ID.',
    'Use operation "update" to modify an existing knowledge base.',
    'Use operation "delete" to remove a knowledge base.'
  ]
})
  .input(
    z.object({
      operation: z
        .enum(['create', 'get', 'update', 'delete', 'list', 'attach', 'detach'])
        .describe('Operation to perform'),
      knowledgeBaseId: z
        .string()
        .optional()
        .describe('Knowledge base ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Name for the knowledge base (used in create/update)'),
      ragUseCondition: z
        .string()
        .optional()
        .describe('When to use this knowledge base (used in create/update)'),
      agentId: z
        .string()
        .optional()
        .describe('Agent model ID from list_agents; required for attach/detach'),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Knowledge bases per page (list; default 25)'),
      offset: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Knowledge bases to skip (list)')
    })
  )
  .output(
    z.object({
      knowledgeBase: z
        .record(z.string(), z.any())
        .optional()
        .describe('Knowledge base details (for get/create/update)'),
      knowledgeBaseId: z.string().optional().describe('Knowledge base ID'),
      knowledgeBases: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Knowledge bases (list)'),
      totalRecords: z.number().optional(),
      attached: z.boolean().optional(),
      detached: z.boolean().optional(),
      deleted: z.boolean().optional().describe('Whether the knowledge base was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { operation, knowledgeBaseId, name, ragUseCondition } = ctx.input;

    if (operation === 'create') {
      let body: Record<string, any> = {};
      if (name) body.name = name;
      if (ragUseCondition) body.rag_use_condition = ragUseCondition;
      let result = await client.createKnowledgeBase(body);
      if (!result.response?.knowledge_base_id)
        throw createApiServiceError('Synthflow did not return the created knowledge base ID.');
      return {
        output: {
          knowledgeBase: result.response,
          knowledgeBaseId: result.response.knowledge_base_id
        },
        message: `Created knowledge base **${name || 'Untitled'}**.`
      };
    }

    if (operation === 'get') {
      if (!knowledgeBaseId)
        throw createApiServiceError('knowledgeBaseId is required for get operation');
      let result = await client.getKnowledgeBase(knowledgeBaseId);
      let knowledgeBases = result.response?.knowledge_bases;
      let knowledgeBase = Array.isArray(knowledgeBases)
        ? knowledgeBases.find(item => item?.id === knowledgeBaseId)
        : undefined;
      if (!knowledgeBase)
        throw createApiServiceError('Synthflow did not return the requested knowledge base.');
      return {
        output: { knowledgeBase, knowledgeBaseId },
        message: `Retrieved knowledge base \`${knowledgeBaseId}\`.`
      };
    }

    if (operation === 'update') {
      if (!knowledgeBaseId)
        throw createApiServiceError('knowledgeBaseId is required for update operation');
      let body = pickDefined({ name, rag_use_condition: ragUseCondition });
      if (!Object.keys(body).length)
        throw createApiServiceError('Provide a name or ragUseCondition to update.');
      await client.updateKnowledgeBase(knowledgeBaseId, body);
      let result = await client.getKnowledgeBase(knowledgeBaseId);
      let knowledgeBases = result.response?.knowledge_bases;
      let knowledgeBase = Array.isArray(knowledgeBases)
        ? knowledgeBases.find(item => item?.id === knowledgeBaseId)
        : undefined;
      if (!knowledgeBase)
        throw createApiServiceError('Synthflow did not return the updated knowledge base.');
      return {
        output: { knowledgeBase, knowledgeBaseId },
        message: `Updated knowledge base \`${knowledgeBaseId}\`.`
      };
    }

    if (operation === 'delete') {
      if (!knowledgeBaseId)
        throw createApiServiceError('knowledgeBaseId is required for delete operation');
      await client.deleteKnowledgeBase(knowledgeBaseId);
      return {
        output: { deleted: true },
        message: `Deleted knowledge base \`${knowledgeBaseId}\`.`
      };
    }

    if (operation === 'list') {
      let result = await client.listKnowledgeBases({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let knowledgeBases = result.response?.knowledge_bases ?? [];
      return {
        output: { knowledgeBases, totalRecords: result.response?.total_records },
        message: `Found ${knowledgeBases.length} knowledge base(s).`
      };
    }

    if (operation === 'attach' || operation === 'detach') {
      if (!knowledgeBaseId || !ctx.input.agentId)
        throw createApiServiceError(
          'knowledgeBaseId and agentId are required for attach/detach.'
        );
      if (operation === 'attach')
        await client.attachKnowledgeBase(knowledgeBaseId, ctx.input.agentId);
      else await client.detachKnowledgeBase(knowledgeBaseId, ctx.input.agentId);
      return {
        output: {
          knowledgeBaseId,
          attached: operation === 'attach',
          detached: operation === 'detach'
        },
        message: `${operation === 'attach' ? 'Attached' : 'Detached'} knowledge base \`${knowledgeBaseId}\` ${operation === 'attach' ? 'to' : 'from'} agent \`${ctx.input.agentId}\`.`
      };
    }

    throw createApiServiceError(`Unknown operation: ${operation}`);
  })
  .build();

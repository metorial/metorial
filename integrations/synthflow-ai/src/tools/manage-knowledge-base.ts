import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageKnowledgeBase = SlateTool.create(spec, {
  name: 'Manage Knowledge Base',
  key: 'manage_knowledge_base',
  description: `Create, retrieve, update, or delete a knowledge base. Knowledge bases allow agents to reference specific domain information during calls. Use the **operation** field to choose the action.`,
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
        .enum(['create', 'get', 'update', 'delete'])
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
        .describe('When to use this knowledge base (used in create/update)')
    })
  )
  .output(
    z.object({
      knowledgeBase: z
        .record(z.string(), z.any())
        .optional()
        .describe('Knowledge base details (for get/create/update)'),
      deleted: z.boolean().optional().describe('Whether the knowledge base was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { operation, knowledgeBaseId, name, ragUseCondition } = ctx.input;

    if (operation === 'create') {
      let body: Record<string, any> = {};
      if (name) body.name = name;
      if (ragUseCondition) body.rag_use_condition = ragUseCondition;
      let result = await client.createKnowledgeBase(body);
      return {
        output: { knowledgeBase: result.response || result },
        message: `Created knowledge base **${name || 'Untitled'}**.`
      };
    }

    if (operation === 'get') {
      if (!knowledgeBaseId) throw new Error('knowledgeBaseId is required for get operation');
      let result = await client.getKnowledgeBase(knowledgeBaseId);
      return {
        output: { knowledgeBase: result.response || result },
        message: `Retrieved knowledge base \`${knowledgeBaseId}\`.`
      };
    }

    if (operation === 'update') {
      if (!knowledgeBaseId)
        throw new Error('knowledgeBaseId is required for update operation');
      let body: Record<string, any> = {};
      if (name) body.name = name;
      if (ragUseCondition) body.rag_use_condition = ragUseCondition;
      let result = await client.updateKnowledgeBase(knowledgeBaseId, body);
      return {
        output: { knowledgeBase: result.response || result },
        message: `Updated knowledge base \`${knowledgeBaseId}\`.`
      };
    }

    if (operation === 'delete') {
      if (!knowledgeBaseId)
        throw new Error('knowledgeBaseId is required for delete operation');
      await client.deleteKnowledgeBase(knowledgeBaseId);
      return {
        output: { deleted: true },
        message: `Deleted knowledge base \`${knowledgeBaseId}\`.`
      };
    }

    throw new Error(`Unknown operation: ${operation}`);
  })
  .build();

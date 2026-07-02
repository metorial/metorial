import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAssistant = SlateTool.create(spec, {
  name: 'Manage Assistant',
  key: 'manage_assistant',
  description: `Create, update, or delete an Assistant in Griptape Cloud. Assistants are chat applications that can be connected to knowledge bases, rulesets, tools, and structures. Use this to configure and manage the lifecycle of your assistants.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      assistantId: z.string().optional().describe('Required for update and delete operations'),
      name: z.string().optional().describe('Name for the assistant (required for create)'),
      description: z.string().optional().describe('Description of the assistant'),
      input: z.string().optional().describe('Default input/prompt for the assistant'),
      model: z.string().optional().describe('Model to use for the assistant'),
      knowledgeBaseIds: z
        .array(z.string())
        .optional()
        .describe('Knowledge base IDs to attach'),
      retrieverIds: z.array(z.string()).optional().describe('Retriever IDs to attach'),
      rulesetIds: z.array(z.string()).optional().describe('Ruleset IDs to attach'),
      structureIds: z.array(z.string()).optional().describe('Structure IDs to attach'),
      toolIds: z.array(z.string()).optional().describe('Tool IDs to attach')
    })
  )
  .output(
    z.object({
      assistantId: z.string().optional().describe('ID of the assistant'),
      name: z.string().optional().describe('Name of the assistant'),
      description: z.string().optional().describe('Description of the assistant'),
      model: z.string().optional().describe('Model used by the assistant'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the assistant was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required for creating an assistant');
      let result = await client.createAssistant({
        name: ctx.input.name,
        description: ctx.input.description,
        input: ctx.input.input,
        model: ctx.input.model,
        knowledgeBaseIds: ctx.input.knowledgeBaseIds,
        retrieverIds: ctx.input.retrieverIds,
        rulesetIds: ctx.input.rulesetIds,
        structureIds: ctx.input.structureIds,
        toolIds: ctx.input.toolIds
      });
      return {
        output: {
          assistantId: result.assistant_id,
          name: result.name,
          description: result.description,
          model: result.model,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Created assistant **${result.name}** (${result.assistant_id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.assistantId) throw new Error('assistantId is required for update');
      let result = await client.updateAssistant(ctx.input.assistantId, {
        name: ctx.input.name,
        description: ctx.input.description,
        input: ctx.input.input,
        model: ctx.input.model,
        knowledgeBaseIds: ctx.input.knowledgeBaseIds,
        retrieverIds: ctx.input.retrieverIds,
        rulesetIds: ctx.input.rulesetIds,
        structureIds: ctx.input.structureIds,
        toolIds: ctx.input.toolIds
      });
      return {
        output: {
          assistantId: result.assistant_id,
          name: result.name,
          description: result.description,
          model: result.model,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Updated assistant **${result.name}** (${result.assistant_id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.assistantId) throw new Error('assistantId is required for delete');
      await client.deleteAssistant(ctx.input.assistantId);
      return {
        output: {
          assistantId: ctx.input.assistantId,
          deleted: true
        },
        message: `Deleted assistant ${ctx.input.assistantId}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();

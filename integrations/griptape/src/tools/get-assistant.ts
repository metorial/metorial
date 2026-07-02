import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAssistant = SlateTool.create(spec, {
  name: 'Get Assistant',
  key: 'get_assistant',
  description: `Retrieve detailed information about a specific assistant by its ID. Returns the assistant's configuration including connected knowledge bases, rulesets, tools, and structures.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      assistantId: z.string().describe('ID of the assistant to retrieve')
    })
  )
  .output(
    z.object({
      assistantId: z.string().describe('ID of the assistant'),
      name: z.string().describe('Name of the assistant'),
      description: z.string().optional().describe('Description of the assistant'),
      input: z.string().optional().describe('Default input/prompt'),
      model: z.string().optional().describe('Model used by the assistant'),
      knowledgeBaseIds: z.array(z.string()).optional().describe('Attached knowledge base IDs'),
      retrieverIds: z.array(z.string()).optional().describe('Attached retriever IDs'),
      rulesetIds: z.array(z.string()).optional().describe('Attached ruleset IDs'),
      structureIds: z.array(z.string()).optional().describe('Attached structure IDs'),
      toolIds: z.array(z.string()).optional().describe('Attached tool IDs'),
      organizationId: z.string().optional().describe('Organization ID'),
      createdAt: z.string().describe('Creation timestamp'),
      createdBy: z.string().optional().describe('Creator identifier'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let a = await client.getAssistant(ctx.input.assistantId);

    return {
      output: {
        assistantId: a.assistant_id,
        name: a.name,
        description: a.description,
        input: a.input,
        model: a.model,
        knowledgeBaseIds: a.knowledge_base_ids,
        retrieverIds: a.retriever_ids,
        rulesetIds: a.ruleset_ids,
        structureIds: a.structure_ids,
        toolIds: a.tool_ids,
        organizationId: a.organization_id,
        createdAt: a.created_at,
        createdBy: a.created_by,
        updatedAt: a.updated_at
      },
      message: `Retrieved assistant **${a.name}** (${a.assistant_id}).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAssistants = SlateTool.create(spec, {
  name: 'List Assistants',
  key: 'list_assistants',
  description: `List all assistants in your Griptape Cloud organization. Returns paginated results with assistant details including their connected knowledge bases, rulesets, tools, and structures.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number to retrieve'),
      pageSize: z.number().optional().describe('Number of items per page')
    })
  )
  .output(
    z.object({
      assistants: z
        .array(
          z.object({
            assistantId: z.string().describe('ID of the assistant'),
            name: z.string().describe('Name of the assistant'),
            description: z.string().optional().describe('Description of the assistant'),
            model: z.string().optional().describe('Model used by the assistant'),
            knowledgeBaseIds: z
              .array(z.string())
              .optional()
              .describe('Attached knowledge base IDs'),
            rulesetIds: z.array(z.string()).optional().describe('Attached ruleset IDs'),
            toolIds: z.array(z.string()).optional().describe('Attached tool IDs'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of assistants'),
      totalCount: z.number().describe('Total number of assistants'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.listAssistants({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let assistants = result.items.map((a: any) => ({
      assistantId: a.assistant_id,
      name: a.name,
      description: a.description,
      model: a.model,
      knowledgeBaseIds: a.knowledge_base_ids,
      rulesetIds: a.ruleset_ids,
      toolIds: a.tool_ids,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));

    return {
      output: {
        assistants,
        totalCount: result.pagination.totalCount,
        totalPages: result.pagination.totalPages
      },
      message: `Found **${result.pagination.totalCount}** assistant(s). Showing page ${result.pagination.pageNumber} of ${result.pagination.totalPages}.`
    };
  })
  .build();

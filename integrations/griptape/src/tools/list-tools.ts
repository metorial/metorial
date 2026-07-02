import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGriptapeTools = SlateTool.create(spec, {
  name: 'List Griptape Tools',
  key: 'list_griptape_tools',
  description: `List all tools available in your Griptape Cloud organization. Tools extend LLM capabilities by providing access to third-party services, APIs, search, calculators, RAG, and more.`,
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
      tools: z
        .array(
          z.object({
            toolId: z.string().describe('ID of the tool'),
            name: z.string().describe('Name of the tool'),
            description: z.string().optional().describe('Description'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of tools'),
      totalCount: z.number().describe('Total number of tools'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.listTools({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let tools = result.items.map((t: any) => ({
      toolId: t.tool_id,
      name: t.name,
      description: t.description,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return {
      output: {
        tools,
        totalCount: result.pagination.totalCount,
        totalPages: result.pagination.totalPages
      },
      message: `Found **${result.pagination.totalCount}** tool(s).`
    };
  })
  .build();

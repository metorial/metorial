import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listKnowledgeBases = SlateTool.create(spec, {
  name: 'List Knowledge Bases',
  key: 'list_knowledge_bases',
  description: `List all knowledge bases in your Griptape Cloud organization. Knowledge Bases are collections of Data Sources that provide RAG capabilities for your AI applications.`,
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
      knowledgeBases: z
        .array(
          z.object({
            knowledgeBaseId: z.string().describe('ID of the knowledge base'),
            name: z.string().describe('Name of the knowledge base'),
            description: z.string().optional().describe('Description'),
            type: z.string().optional().describe('Type of knowledge base'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of knowledge bases'),
      totalCount: z.number().describe('Total number of knowledge bases'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.listKnowledgeBases({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let knowledgeBases = result.items.map((kb: any) => ({
      knowledgeBaseId: kb.knowledge_base_id,
      name: kb.name,
      description: kb.description,
      type: kb.type,
      createdAt: kb.created_at,
      updatedAt: kb.updated_at
    }));

    return {
      output: {
        knowledgeBases,
        totalCount: result.pagination.totalCount,
        totalPages: result.pagination.totalPages
      },
      message: `Found **${result.pagination.totalCount}** knowledge base(s).`
    };
  })
  .build();

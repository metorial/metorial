import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRetrievers = SlateTool.create(spec, {
  name: 'List Retrievers',
  key: 'list_retrievers',
  description: `List all retrievers in your Griptape Cloud organization. Retrievers provide RAG capabilities across multiple Knowledge Bases with reranking support.`,
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
      retrievers: z
        .array(
          z.object({
            retrieverId: z.string().describe('ID of the retriever'),
            name: z.string().describe('Name of the retriever'),
            description: z.string().optional().describe('Description'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of retrievers'),
      totalCount: z.number().describe('Total number of retrievers'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.listRetrievers({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let retrievers = result.items.map((r: any) => ({
      retrieverId: r.retriever_id,
      name: r.name,
      description: r.description,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return {
      output: {
        retrievers,
        totalCount: result.pagination.totalCount,
        totalPages: result.pagination.totalPages
      },
      message: `Found **${result.pagination.totalCount}** retriever(s).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createMemory = SlateTool.create(spec, {
  name: 'Create Memory',
  key: 'create_memory',
  description: `Create a new memory (RAG knowledge base) in Langbase. Memory provides vector store, file storage, and semantic similarity search. After creating a memory, upload documents to it for retrieval-augmented generation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the memory. Must be unique within your account.'),
      description: z.string().optional().describe('Description of the memory'),
      embeddingModel: z
        .enum([
          'openai:text-embedding-3-large',
          'cohere:embed-v4.0',
          'cohere:embed-multilingual-v3.0',
          'cohere:embed-multilingual-light-v3.0',
          'google:text-embedding-004'
        ])
        .optional()
        .describe('Embedding model to use. Defaults to openai:text-embedding-3-large.'),
      chunkSize: z
        .number()
        .optional()
        .describe('Maximum chunk size for document splitting (max 30000)'),
      chunkOverlap: z.number().optional().describe('Overlap between chunks (minimum 256)'),
      topK: z
        .number()
        .optional()
        .describe('Number of top results to return in similarity search (1-100)')
    })
  )
  .output(
    z.object({
      memoryName: z.string().describe('Name of the created memory'),
      description: z.string().describe('Description of the memory'),
      ownerLogin: z.string().describe('Owner account login'),
      url: z.string().describe('URL of the memory'),
      embeddingModel: z.string().describe('Embedding model used'),
      chunkSize: z.number().describe('Chunk size setting'),
      chunkOverlap: z.number().describe('Chunk overlap setting')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let body: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.embeddingModel !== undefined)
      body.embedding_model = ctx.input.embeddingModel;
    if (ctx.input.chunkSize !== undefined) body.chunk_size = ctx.input.chunkSize;
    if (ctx.input.chunkOverlap !== undefined) body.chunk_overlap = ctx.input.chunkOverlap;
    if (ctx.input.topK !== undefined) body.top_k = ctx.input.topK;

    let result = await client.createMemory(body);

    return {
      output: {
        memoryName: result.name,
        description: result.description ?? '',
        ownerLogin: result.owner_login ?? '',
        url: result.url ?? '',
        embeddingModel: result.embedding_model ?? 'openai:text-embedding-3-large',
        chunkSize: result.chunk_size ?? 10000,
        chunkOverlap: result.chunk_overlap ?? 2048
      },
      message: `Created memory **${result.name}** with embedding model \`${result.embedding_model}\`.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let memorySchema = z.object({
  memoryName: z.string().describe('Name of the memory'),
  description: z.string().describe('Description of the memory'),
  ownerLogin: z.string().describe('Owner account login'),
  url: z.string().describe('URL of the memory'),
  embeddingModel: z.string().describe('Embedding model used')
});

export let listMemories = SlateTool.create(spec, {
  name: 'List Memories',
  key: 'list_memories',
  description: `List all memory (RAG knowledge bases) in your Langbase account. Returns the name, description, and embedding model for each memory.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      memories: z.array(memorySchema).describe('List of memories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.listMemories();

    let memories = (Array.isArray(result) ? result : []).map((m: any) => ({
      memoryName: m.name ?? '',
      description: m.description ?? '',
      ownerLogin: m.owner_login ?? '',
      url: m.url ?? '',
      embeddingModel: m.embeddingModel ?? m.embedding_model ?? ''
    }));

    return {
      output: { memories },
      message: `Found **${memories.length}** memory(s).`
    };
  })
  .build();

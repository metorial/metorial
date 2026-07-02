import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let retrievalResultSchema = z.object({
  text: z.string().describe('The retrieved text chunk'),
  similarity: z.number().describe('Similarity score (0-1)'),
  meta: z.record(z.string(), z.any()).optional().describe('Metadata associated with the chunk')
});

export let retrieveMemory = SlateTool.create(spec, {
  name: 'Retrieve from Memory',
  key: 'retrieve_memory',
  description: `Perform a semantic similarity search against one or more memories. Returns the most relevant text chunks based on the query. Useful for testing RAG retrieval and debugging chunking parameters.`,
  constraints: ['topK range is 1-100, defaults to 20.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The search query to find relevant content'),
      memoryNames: z.array(z.string()).describe('Names of the memories to search in'),
      topK: z
        .number()
        .optional()
        .describe('Number of top results to return (1-100, defaults to 20)')
    })
  )
  .output(
    z.object({
      results: z
        .array(retrievalResultSchema)
        .describe('Retrieved text chunks with similarity scores')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let body: Record<string, any> = {
      query: ctx.input.query,
      memory: ctx.input.memoryNames.map(name => ({ name }))
    };

    if (ctx.input.topK !== undefined) body.topK = ctx.input.topK;

    let result = await client.retrieveMemory(body);

    let results = (Array.isArray(result) ? result : []).map((r: any) => ({
      text: r.text ?? '',
      similarity: r.similarity ?? 0,
      meta: r.meta
    }));

    return {
      output: { results },
      message: `Retrieved **${results.length}** result(s) for query "${ctx.input.query}".`
    };
  })
  .build();

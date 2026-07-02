import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeedleClient } from '../lib/client';
import { spec } from '../spec';

export let searchCollection = SlateTool.create(spec, {
  name: 'Search Collection',
  key: 'search_collection',
  description: `Perform AI-powered semantic search across all documents in a collection. Needle automatically handles chunking, embedding, and reranking to return the most relevant text passages for the given query.`,
  instructions: [
    'Provide a natural language query to find relevant document passages.',
    'Use topK to control how many results are returned (defaults to the API default if omitted).',
    'Use offset for pagination through large result sets.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionId: z.string().describe('ID of the collection to search'),
      query: z.string().describe('Natural language search query'),
      topK: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            resultId: z.string().describe('Unique identifier of the search result'),
            content: z.string().describe('Matched text passage from the document'),
            fileId: z.string().describe('ID of the source file containing this passage')
          })
        )
        .describe('Ranked list of matching text passages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeedleClient(ctx.auth.token);
    let results = await client.searchCollection(ctx.input.collectionId, ctx.input.query, {
      topK: ctx.input.topK,
      offset: ctx.input.offset
    });

    let mapped = results.map(r => ({
      resultId: r.id,
      content: r.content,
      fileId: r.file_id
    }));

    return {
      output: { results: mapped },
      message: `Found **${mapped.length}** result(s) for query "${ctx.input.query}".`
    };
  })
  .build();

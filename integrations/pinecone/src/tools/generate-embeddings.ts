import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let generateEmbeddingsTool = SlateTool.create(spec, {
  name: 'Generate Embeddings',
  key: 'generate_embeddings',
  description: `Generate vector embeddings from text using Pinecone's hosted embedding models. Returns dense or sparse vectors that can be stored in an index or used for queries. Available models include \`llama-text-embed-v2\` (dense, high-performance), \`multilingual-e5-large\` (dense, multilingual), and \`pinecone-sparse-english-v0\` (sparse, keyword search).`,
  instructions: [
    'Set inputType to "passage" when embedding documents for storage, and "query" when embedding search queries.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe(
          'Embedding model name (e.g. llama-text-embed-v2, multilingual-e5-large, pinecone-sparse-english-v0)'
        ),
      texts: z.array(z.string()).min(1).describe('Text strings to generate embeddings for'),
      inputType: z
        .enum(['passage', 'query'])
        .optional()
        .describe('Whether the text is a document passage or search query'),
      truncate: z
        .enum(['END', 'NONE'])
        .optional()
        .describe('How to handle text exceeding the model token limit')
    })
  )
  .output(
    z.object({
      model: z.string().describe('Model used for embedding'),
      vectorType: z.string().describe('Type of vectors produced (dense or sparse)'),
      embeddings: z
        .array(
          z.object({
            values: z.array(z.number()).describe('Embedding vector values')
          })
        )
        .describe('Generated embedding vectors'),
      totalTokens: z.number().describe('Total tokens processed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PineconeControlPlaneClient({ token: ctx.auth.token });

    let parameters: { input_type?: string; truncate?: string } = {};
    if (ctx.input.inputType) parameters.input_type = ctx.input.inputType;
    if (ctx.input.truncate) parameters.truncate = ctx.input.truncate;

    let result = await client.generateEmbeddings({
      model: ctx.input.model,
      inputs: ctx.input.texts.map(text => ({ text })),
      parameters: Object.keys(parameters).length > 0 ? parameters : undefined
    });

    let embeddings = (result.data || []).map(d => ({
      values: d.values
    }));

    return {
      output: {
        model: result.model,
        vectorType: result.vector_type,
        embeddings,
        totalTokens: result.usage.total_tokens
      },
      message: `Generated **${embeddings.length}** ${result.vector_type} embedding${embeddings.length === 1 ? '' : 's'} using \`${result.model}\`. Used ${result.usage.total_tokens} tokens.`
    };
  })
  .build();

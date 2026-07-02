import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let propertyInputSchema = z.object({
  name: z.string().describe('Property name'),
  dataType: z
    .array(z.string())
    .describe(
      'Data type(s) for this property (e.g. ["text"], ["int"], ["number"], ["boolean"], ["date"], ["text[]"], ["object"], or a cross-reference class name)'
    ),
  description: z.string().optional().describe('Property description'),
  tokenization: z
    .string()
    .optional()
    .describe(
      'Tokenization strategy: word, lowercase, whitespace, field, trigram, gse, kagome_kr'
    ),
  indexFilterable: z.boolean().optional().describe('Whether to index for filtering'),
  indexSearchable: z.boolean().optional().describe('Whether to index for text search'),
  moduleConfig: z
    .any()
    .optional()
    .describe('Per-property module configuration (e.g. vectorizer skip settings)')
});

export let createCollection = SlateTool.create(spec, {
  name: 'Create Collection',
  key: 'create_collection',
  description: `Create a new collection (class) in Weaviate with its schema definition. Configure properties, vectorizer, generative module, vector index settings, and multi-tenancy.
The vectorizer and generative module **cannot be changed after creation**.`,
  instructions: [
    'Collection names must start with an uppercase letter.',
    'Property names must start with a lowercase letter.',
    'Once a vectorizer or generative module is set, it cannot be changed.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      collectionName: z
        .string()
        .describe('Name of the collection (must start with uppercase)'),
      description: z.string().optional().describe('Description of the collection'),
      properties: z
        .array(propertyInputSchema)
        .optional()
        .describe('Array of property definitions'),
      vectorizer: z
        .string()
        .optional()
        .describe(
          'Vectorizer module name (e.g. text2vec-openai, text2vec-cohere, text2vec-huggingface, none)'
        ),
      generativeModule: z
        .string()
        .optional()
        .describe(
          'Generative module name (e.g. generative-openai, generative-cohere, generative-anthropic)'
        ),
      moduleConfig: z.any().optional().describe('Module configuration object'),
      vectorIndexType: z
        .string()
        .optional()
        .describe('Vector index type: hnsw (default) or flat'),
      vectorIndexConfig: z.any().optional().describe('Vector index configuration'),
      replicationConfig: z
        .object({
          factor: z.number().optional().describe('Replication factor')
        })
        .optional()
        .describe('Replication settings'),
      multiTenancyConfig: z
        .object({
          enabled: z.boolean().describe('Whether multi-tenancy is enabled')
        })
        .optional()
        .describe('Multi-tenancy settings'),
      invertedIndexConfig: z.any().optional().describe('Inverted index configuration')
    })
  )
  .output(
    z
      .object({
        class: z.string().describe('Created collection name'),
        description: z.string().optional().describe('Collection description'),
        properties: z.array(z.any()).optional().describe('Collection properties'),
        vectorizer: z.string().optional().describe('Configured vectorizer')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { collectionName, generativeModule, ...rest } = ctx.input;

    let schema: Record<string, any> = {
      class: collectionName,
      ...rest
    };

    // Set module config for generative module
    if (generativeModule && !schema.moduleConfig) {
      schema.moduleConfig = {
        [generativeModule]: {}
      };
    } else if (generativeModule && schema.moduleConfig) {
      schema.moduleConfig = {
        ...schema.moduleConfig,
        [generativeModule]: schema.moduleConfig[generativeModule] || {}
      };
    }

    let result = await client.createCollection(schema);
    return {
      output: result,
      message: `Created collection **${collectionName}** with ${ctx.input.properties?.length || 0} properties.`
    };
  })
  .build();

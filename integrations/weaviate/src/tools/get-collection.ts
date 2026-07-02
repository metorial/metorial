import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getCollection = SlateTool.create(spec, {
  name: 'Get Collection',
  key: 'get_collection',
  description: `Retrieve the full schema definition of a specific collection, including its properties, vectorizer configuration, module settings, vector index type, and multi-tenancy configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection to retrieve')
    })
  )
  .output(
    z
      .object({
        class: z.string().describe('Collection name'),
        description: z.string().optional().describe('Collection description'),
        properties: z.array(z.any()).optional().describe('Collection properties'),
        vectorizer: z.string().optional().describe('Configured vectorizer module'),
        moduleConfig: z.any().optional().describe('Module configuration'),
        vectorIndexType: z.string().optional().describe('Vector index type'),
        multiTenancyConfig: z.any().optional().describe('Multi-tenancy configuration'),
        replicationConfig: z.any().optional().describe('Replication configuration'),
        shardingConfig: z.any().optional().describe('Sharding configuration'),
        invertedIndexConfig: z.any().optional().describe('Inverted index configuration')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let collection = await client.getCollection(ctx.input.collectionName);
    return {
      output: collection,
      message: `Retrieved collection **${ctx.input.collectionName}** with ${collection.properties?.length || 0} properties.`
    };
  })
  .build();

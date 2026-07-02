import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let propertySchema = z
  .object({
    name: z.string().describe('Property name'),
    dataType: z.array(z.string()).describe('Property data types'),
    description: z.string().optional().describe('Property description')
  })
  .passthrough();

let collectionSchema = z
  .object({
    class: z.string().describe('Collection name'),
    description: z.string().optional().describe('Collection description'),
    properties: z.array(propertySchema).optional().describe('Collection properties'),
    vectorizer: z.string().optional().describe('Configured vectorizer module'),
    moduleConfig: z.any().optional().describe('Module configuration'),
    vectorIndexType: z.string().optional().describe('Vector index type'),
    multiTenancyConfig: z.any().optional().describe('Multi-tenancy configuration')
  })
  .passthrough();

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `List all collections (classes) in the Weaviate instance. Returns each collection's name, description, properties, vectorizer, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      collections: z.array(collectionSchema).describe('List of collections')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listCollections();
    let collections = result.classes || [];
    return {
      output: { collections },
      message: `Found **${collections.length}** collection(s).`
    };
  })
  .build();

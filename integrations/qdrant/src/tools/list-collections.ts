import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `Lists all collections in the Qdrant cluster. Returns the name of each collection. Use this to discover available collections before performing operations on them.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      collections: z
        .array(
          z.object({
            collectionName: z.string().describe('Name of the collection')
          })
        )
        .describe('List of collections in the cluster')
    })
  )
  .handleInvocation(async ctx => {
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint!,
      token: ctx.auth.token
    });

    let result = await client.listCollections();

    return {
      output: {
        collections: result.collections.map(c => ({ collectionName: c.name }))
      },
      message: `Found **${result.collections.length}** collection(s): ${result.collections.map(c => `\`${c.name}\``).join(', ') || 'none'}`
    };
  })
  .build();

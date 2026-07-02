import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

export let getCollection = SlateTool.create(spec, {
  name: 'Get Collection Info',
  key: 'get_collection',
  description: `Retrieves detailed information about a specific Qdrant collection, including its status, vector configuration, point count, indexed vectors count, and payload schema. Useful for inspecting collection health and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection to inspect')
    })
  )
  .output(
    z.object({
      collectionName: z.string().describe('Name of the collection'),
      status: z.string().describe('Collection status: green, yellow, grey, or red'),
      optimizerStatus: z.any().describe('Current optimizer status'),
      pointsCount: z.number().describe('Total number of points in the collection'),
      indexedVectorsCount: z.number().describe('Number of indexed vectors'),
      segmentsCount: z.number().describe('Number of segments'),
      vectorConfig: z.any().describe('Vector configuration of the collection'),
      payloadSchema: z.any().describe('Schema of indexed payload fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint!,
      token: ctx.auth.token
    });

    let info = await client.getCollection(ctx.input.collectionName);

    return {
      output: {
        collectionName: ctx.input.collectionName,
        status: info.status,
        optimizerStatus: info.optimizer_status,
        pointsCount: info.points_count,
        indexedVectorsCount: info.indexed_vectors_count,
        segmentsCount: info.segments_count,
        vectorConfig: info.config?.params?.vectors,
        payloadSchema: info.payload_schema
      },
      message: `Collection \`${ctx.input.collectionName}\` is **${info.status}** with **${info.points_count}** points and **${info.indexed_vectors_count}** indexed vectors.`
    };
  })
  .build();

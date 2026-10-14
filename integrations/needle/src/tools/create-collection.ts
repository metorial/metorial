import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeedleClient } from '../lib/client';
import { spec } from '../spec';

export let createCollection = SlateTool.create(spec, {
  name: 'Create Collection',
  key: 'create_collection',
  description: `Create a new document collection. The authenticated user will be the owner of the created collection. Collections are the primary organizational unit for indexing and searching documents.`
})
  .input(
    z.object({
      name: z.string().min(1).describe('Name for the new collection'),
      fileIds: z
        .array(z.string())
        .optional()
        .describe(
          'Optional existing file IDs from your uploads to include in the new collection'
        ),
      model: z
        .enum(['basilikum-minima', 'mate-meta', 'tortellini-maxima'])
        .optional()
        .describe('Optional retrieval model; Needle uses its default when omitted')
    })
  )
  .output(
    z.object({
      collectionId: z.string().describe('Unique identifier of the created collection'),
      name: z.string().describe('Name of the created collection'),
      createdAt: z.string().describe('ISO timestamp when the collection was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeedleClient(ctx.auth.token);
    let result = await client.createCollection(ctx.input.name, {
      fileIds: ctx.input.fileIds,
      model: ctx.input.model
    });

    return {
      output: {
        collectionId: result.id,
        name: result.name,
        createdAt: result.created_at
      },
      message: `Created collection **${result.name}** (ID: \`${result.id}\`).`
    };
  })
  .build();

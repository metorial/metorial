import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeDataPlaneClient } from '../lib/client';
import { pineconeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let deleteVectorsTool = SlateTool.create(spec, {
  name: 'Delete Vectors',
  key: 'delete_vectors',
  description: `Remove vectors from a Pinecone index. Delete specific vectors by ID, delete by metadata filter, or delete all vectors in a namespace. Useful for cleaning up data, removing outdated records, or clearing entire namespaces.`,
  instructions: [
    'Provide vector IDs to delete specific vectors, or use a metadata filter for selective deletion.',
    'Set deleteAll to true to remove all vectors in a namespace.',
    'These options are mutually exclusive - use only one deletion method per request.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      indexHost: z.string().describe('Host URL of the index'),
      namespace: z.string().optional().describe('Namespace to delete from'),
      vectorIds: z
        .array(z.string())
        .max(1000)
        .optional()
        .describe('Specific vector IDs to delete (max 1000)'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Metadata filter for selective deletion'),
      deleteAll: z.boolean().optional().describe('Delete all vectors in the namespace')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the delete operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let methodCount = [
      ctx.input.vectorIds && ctx.input.vectorIds.length > 0,
      ctx.input.filter,
      ctx.input.deleteAll
    ].filter(Boolean).length;

    if (methodCount !== 1) {
      throw pineconeServiceError(
        'Provide exactly one delete method: vectorIds, filter, or deleteAll.'
      );
    }

    let client = new PineconeDataPlaneClient({
      token: ctx.auth.token,
      indexHost: ctx.input.indexHost
    });

    await client.deleteVectors({
      ids: ctx.input.vectorIds,
      deleteAll: ctx.input.deleteAll,
      namespace: ctx.input.namespace,
      filter: ctx.input.filter
    });

    let description = ctx.input.deleteAll
      ? `all vectors${ctx.input.namespace ? ` in namespace \`${ctx.input.namespace}\`` : ''}`
      : ctx.input.vectorIds
        ? `**${ctx.input.vectorIds.length}** vector${ctx.input.vectorIds.length === 1 ? '' : 's'} by ID`
        : 'vectors matching the provided filter';

    return {
      output: { deleted: true },
      message: `Deleted ${description}.`
    };
  })
  .build();

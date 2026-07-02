import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeDataPlaneClient } from '../lib/client';
import { pineconeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageNamespacesTool = SlateTool.create(spec, {
  name: 'Manage Namespaces',
  key: 'manage_namespaces',
  description: `Create, list, describe, or delete namespaces in a Pinecone serverless index. Namespaces partition records for multitenancy and targeted search.`,
  instructions: [
    'Namespace management endpoints are supported for serverless indexes, not legacy pod-based indexes.',
    'Use create when you need a namespace schema before inserting records.',
    'Delete is irreversible and permanently removes all records in that namespace.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      indexHost: z.string().describe('Host URL of the index'),
      action: z.enum(['create', 'list', 'describe', 'delete']).describe('Action to perform'),
      namespace: z
        .string()
        .optional()
        .describe('Namespace name. Required for create, describe, and delete.'),
      schema: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Optional namespace schema for create, such as { fields: { fieldName: { filterable: true } } }'
        ),
      limit: z.number().int().min(1).optional().describe('Maximum namespaces to list'),
      paginationToken: z.string().optional().describe('Token for the next list page')
    })
  )
  .output(
    z.object({
      namespaces: z
        .array(
          z.object({
            namespace: z.string().describe('Namespace name'),
            recordCount: z
              .number()
              .optional()
              .describe('Number of records in the namespace when returned'),
            schema: z.any().optional().describe('Namespace schema when returned')
          })
        )
        .optional()
        .describe('Namespaces returned by list, create, or describe'),
      nextPaginationToken: z.string().optional().describe('Token for the next list page'),
      deleted: z.boolean().optional().describe('Whether the namespace was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PineconeDataPlaneClient({
      token: ctx.auth.token,
      indexHost: ctx.input.indexHost
    });

    if (ctx.input.action === 'list') {
      let result = await client.listNamespaces({
        limit: ctx.input.limit,
        paginationToken: ctx.input.paginationToken
      });
      let namespaces = (result.namespaces || []).map(namespace => ({
        namespace: namespace.name,
        recordCount:
          namespace.record_count === undefined ? undefined : Number(namespace.record_count),
        schema: namespace.schema
      }));
      return {
        output: {
          namespaces,
          nextPaginationToken: result.pagination?.next
        },
        message: `Found **${namespaces.length}** namespace${namespaces.length === 1 ? '' : 's'}${result.pagination?.next ? ' (more pages available)' : ''}.`
      };
    }

    if (!ctx.input.namespace) {
      throw pineconeServiceError(`namespace is required for ${ctx.input.action}.`);
    }

    if (ctx.input.action === 'create') {
      let result = await client.createNamespace({
        name: ctx.input.namespace,
        schema: ctx.input.schema
      });
      return {
        output: {
          namespaces: [
            {
              namespace: result.name,
              recordCount:
                result.record_count === undefined ? undefined : Number(result.record_count),
              schema: result.schema
            }
          ]
        },
        message: `Created namespace \`${result.name}\`.`
      };
    }

    if (ctx.input.action === 'describe') {
      let result = await client.describeNamespace(ctx.input.namespace);
      return {
        output: {
          namespaces: [
            {
              namespace: result.name,
              recordCount:
                result.record_count === undefined ? undefined : Number(result.record_count),
              schema: result.schema
            }
          ]
        },
        message: `Namespace \`${result.name}\` has ${result.record_count ?? 0} records.`
      };
    }

    await client.deleteNamespace(ctx.input.namespace);
    return {
      output: { deleted: true },
      message: `Deleted namespace \`${ctx.input.namespace}\`.`
    };
  })
  .build();

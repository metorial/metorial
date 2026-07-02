import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { databricksServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageVectorSearch = SlateTool.create(spec, {
  name: 'Manage Vector Search',
  key: 'manage_vector_search',
  description: `Manage and query Databricks Vector Search endpoints and indexes. Supports listing, getting, creating, and deleting endpoints; listing and getting indexes; deleting indexes; and querying an index with text or vector input.`,
  instructions: [
    'Creating endpoints can provision compute; use create_endpoint only when the workspace is intended to own that endpoint.',
    'For query_index, provide indexName, columns, and either queryText or queryVector.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_endpoints',
          'get_endpoint',
          'create_endpoint',
          'delete_endpoint',
          'list_indexes',
          'get_index',
          'delete_index',
          'query_index'
        ])
        .describe('Vector Search operation to perform'),
      endpointName: z
        .string()
        .optional()
        .describe('Vector Search endpoint name for endpoint actions and list_indexes'),
      endpointType: z
        .enum(['STANDARD', 'STORAGE_OPTIMIZED'])
        .optional()
        .describe('Endpoint type for create_endpoint'),
      indexName: z
        .string()
        .optional()
        .describe('Full Vector Search index name, usually catalog.schema.index'),
      columns: z
        .array(z.string())
        .optional()
        .describe('Columns to return from query_index results'),
      queryText: z.string().optional().describe('Text query for query_index'),
      queryVector: z.array(z.number()).optional().describe('Embedding vector for query_index'),
      numResults: z.number().optional().describe('Maximum query_index results to return'),
      filtersJson: z
        .string()
        .optional()
        .describe('JSON filter expression for query_index, passed through to Databricks')
    })
  )
  .output(
    z.object({
      endpoints: z.array(z.any()).optional().describe('Vector Search endpoints'),
      endpoint: z.any().optional().describe('Vector Search endpoint details'),
      indexes: z.array(z.any()).optional().describe('Vector Search indexes'),
      index: z.any().optional().describe('Vector Search index details'),
      queryResult: z.any().optional().describe('Vector Search query response'),
      endpointName: z.string().optional().describe('Affected endpoint name'),
      indexName: z.string().optional().describe('Affected index name'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'list_endpoints': {
        let endpoints = await client.listVectorSearchEndpoints();
        return {
          output: { endpoints, success: true },
          message: `Found **${endpoints.length}** vector search endpoint(s).`
        };
      }
      case 'get_endpoint': {
        if (!ctx.input.endpointName)
          throw databricksServiceError('endpointName is required for get_endpoint');
        let endpoint = await client.getVectorSearchEndpoint(ctx.input.endpointName);
        return {
          output: { endpoint, endpointName: ctx.input.endpointName, success: true },
          message: `Retrieved vector search endpoint **${ctx.input.endpointName}**.`
        };
      }
      case 'create_endpoint': {
        if (!ctx.input.endpointName || !ctx.input.endpointType) {
          throw databricksServiceError(
            'endpointName and endpointType are required for create_endpoint'
          );
        }
        let endpoint = await client.createVectorSearchEndpoint(
          ctx.input.endpointName,
          ctx.input.endpointType
        );
        return {
          output: { endpoint, endpointName: ctx.input.endpointName, success: true },
          message: `Created vector search endpoint **${ctx.input.endpointName}**.`
        };
      }
      case 'delete_endpoint': {
        if (!ctx.input.endpointName)
          throw databricksServiceError('endpointName is required for delete_endpoint');
        await client.deleteVectorSearchEndpoint(ctx.input.endpointName);
        return {
          output: { endpointName: ctx.input.endpointName, success: true },
          message: `Deleted vector search endpoint **${ctx.input.endpointName}**.`
        };
      }
      case 'list_indexes': {
        if (!ctx.input.endpointName)
          throw databricksServiceError('endpointName is required for list_indexes');
        let indexes = await client.listVectorSearchIndexes(ctx.input.endpointName);
        return {
          output: { indexes, endpointName: ctx.input.endpointName, success: true },
          message: `Found **${indexes.length}** vector search index(es).`
        };
      }
      case 'get_index': {
        if (!ctx.input.indexName)
          throw databricksServiceError('indexName is required for get_index');
        let index = await client.getVectorSearchIndex(ctx.input.indexName);
        return {
          output: { index, indexName: ctx.input.indexName, success: true },
          message: `Retrieved vector search index **${ctx.input.indexName}**.`
        };
      }
      case 'delete_index': {
        if (!ctx.input.indexName)
          throw databricksServiceError('indexName is required for delete_index');
        await client.deleteVectorSearchIndex(ctx.input.indexName);
        return {
          output: { indexName: ctx.input.indexName, success: true },
          message: `Deleted vector search index **${ctx.input.indexName}**.`
        };
      }
      case 'query_index': {
        if (!ctx.input.indexName)
          throw databricksServiceError('indexName is required for query_index');
        if (!ctx.input.columns || ctx.input.columns.length === 0)
          throw databricksServiceError('columns is required for query_index');
        if (!ctx.input.queryText && !ctx.input.queryVector)
          throw databricksServiceError('queryText or queryVector is required for query_index');
        let queryResult = await client.queryVectorSearchIndex(ctx.input.indexName, {
          queryText: ctx.input.queryText,
          queryVector: ctx.input.queryVector,
          columns: ctx.input.columns,
          numResults: ctx.input.numResults,
          filtersJson: ctx.input.filtersJson
        });
        return {
          output: { queryResult, indexName: ctx.input.indexName, success: true },
          message: `Queried vector search index **${ctx.input.indexName}**.`
        };
      }
    }
  })
  .build();

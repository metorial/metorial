import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { invalidAction, requireString, resolveProjectId } from '../lib/validation';
import { spec } from '../spec';

export let manageSearchIndexesTool = SlateTool.create(spec, {
  name: 'Manage Search Indexes',
  key: 'manage_search_indexes',
  description: `Create, update, list, or delete Atlas Search indexes on MongoDB collections. Configure analyzers, field mappings, and synonyms for full-text search capabilities.`,
  instructions: [
    'Atlas Search indexes require a dedicated or flex cluster.',
    'The definition object should contain mappings with field definitions.',
    'Use "dynamic" mappings to automatically index all fields, or "static" for explicit field configurations.'
  ]
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Atlas Project ID. Uses config projectId if not provided.'),
      clusterName: z.string().describe('Cluster name'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      databaseName: z.string().optional().describe('Database name (required for list/create)'),
      collectionName: z
        .string()
        .optional()
        .describe('Collection name (required for list/create)'),
      indexId: z.string().optional().describe('Search index ID (for get/update/delete)'),
      indexName: z.string().optional().describe('Search index name (for create)'),
      type: z.enum(['search', 'vectorSearch']).optional().describe('Index type'),
      definition: z
        .any()
        .optional()
        .describe('Search index definition including mappings, analyzers, and synonyms')
    })
  )
  .output(
    z.object({
      index: z.any().optional(),
      indexes: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);

    let { action } = ctx.input;
    let clusterName = requireString(ctx.input.clusterName, 'clusterName');

    if (action === 'list') {
      let databaseName = requireString(
        ctx.input.databaseName,
        'databaseName',
        'for listing search indexes'
      );
      let collectionName = requireString(
        ctx.input.collectionName,
        'collectionName',
        'for listing search indexes'
      );
      let indexes = await client.listSearchIndexes(
        projectId,
        clusterName,
        databaseName,
        collectionName
      );
      return {
        output: { indexes: Array.isArray(indexes) ? indexes : indexes.results || [] },
        message: `Found search indexes on **${databaseName}.${collectionName}**.`
      };
    }

    if (action === 'get') {
      let indexId = requireString(ctx.input.indexId, 'indexId');
      let index = await client.getSearchIndex(projectId, clusterName, indexId);
      return {
        output: { index },
        message: `Retrieved search index **${indexId}**.`
      };
    }

    if (action === 'create') {
      let databaseName = requireString(
        ctx.input.databaseName,
        'databaseName',
        'for creating a search index'
      );
      let collectionName = requireString(
        ctx.input.collectionName,
        'collectionName',
        'for creating a search index'
      );
      let data: any = {
        database: databaseName,
        collectionName,
        name: ctx.input.indexName || 'default',
        type: ctx.input.type || 'search'
      };
      if (ctx.input.definition) data.definition = ctx.input.definition;

      let index = await client.createSearchIndex(projectId, clusterName, data);
      return {
        output: { index },
        message: `Created search index **${data.name}** on **${databaseName}.${collectionName}**.`
      };
    }

    if (action === 'update') {
      let indexId = requireString(ctx.input.indexId, 'indexId');
      let data: any = {};
      if (ctx.input.definition) data.definition = ctx.input.definition;
      if (ctx.input.indexName) data.name = ctx.input.indexName;

      let index = await client.updateSearchIndex(projectId, clusterName, indexId, data);
      return {
        output: { index },
        message: `Updated search index **${indexId}**.`
      };
    }

    if (action === 'delete') {
      let indexId = requireString(ctx.input.indexId, 'indexId');
      await client.deleteSearchIndex(projectId, clusterName, indexId);
      return {
        output: {},
        message: `Deleted search index **${indexId}**.`
      };
    }

    return invalidAction(action);
  })
  .build();

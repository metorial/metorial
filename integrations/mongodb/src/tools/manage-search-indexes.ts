import { SlateTool } from 'slates';
import { z } from 'zod';
import { AtlasClient } from '../lib/client';
import { spec } from '../spec';

let searchIndexSchema = z.object({
  indexId: z.string().optional().describe('Unique identifier of the search index'),
  name: z.string().describe('Name of the search index'),
  clusterName: z.string().optional().describe('Cluster the index belongs to'),
  database: z.string().describe('Database containing the indexed collection'),
  collectionName: z.string().describe('Collection being indexed'),
  type: z.string().optional().describe('Index type (search, vectorSearch)'),
  status: z.string().optional().describe('Current status of the index'),
  definition: z
    .record(z.string(), z.any())
    .optional()
    .describe('Index definition including mappings and analyzers')
});

export let manageSearchIndexesTool = SlateTool.create(spec, {
  name: 'Manage Search Indexes',
  key: 'manage_search_indexes',
  description: `List, create, update, or delete Atlas Search indexes on MongoDB Atlas collections. Atlas Search enables full-text search, faceted search, and vector search capabilities on your data.`,
  instructions: [
    'Use type "search" for standard Atlas Search indexes and "vectorSearch" for vector search indexes.',
    'The definition object contains mappings (field definitions) and optional analyzers.',
    'When listing, you must provide the database and collection names.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID. Falls back to configured projectId.'),
      clusterName: z.string().describe('Cluster name'),
      indexId: z.string().optional().describe('Search index ID (for get, update, delete)'),
      database: z.string().optional().describe('Database name (required for list, create)'),
      collectionName: z
        .string()
        .optional()
        .describe('Collection name (required for list, create)'),
      name: z.string().optional().describe('Index name (required for create)'),
      type: z.enum(['search', 'vectorSearch']).optional().describe('Index type'),
      definition: z
        .record(z.string(), z.any())
        .optional()
        .describe('Index definition with mappings, analyzers, etc.')
    })
  )
  .output(
    z.object({
      indexes: z.array(searchIndexSchema).optional().describe('List of search indexes'),
      index: searchIndexSchema.optional().describe('Single search index'),
      deleted: z.boolean().optional().describe('Whether the index was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('projectId is required');

    let client = new AtlasClient(ctx.auth);

    if (ctx.input.action === 'list') {
      if (!ctx.input.database) throw new Error('database is required for list');
      if (!ctx.input.collectionName) throw new Error('collectionName is required for list');
      let result = await client.listSearchIndexes(
        projectId,
        ctx.input.clusterName,
        ctx.input.database,
        ctx.input.collectionName
      );
      let indexes = (Array.isArray(result) ? result : result.results || []).map(
        (idx: any) => ({
          indexId: idx.indexID || idx.id,
          name: idx.name,
          clusterName: idx.clusterName,
          database: idx.database,
          collectionName: idx.collectionName,
          type: idx.type,
          status: idx.status,
          definition: idx.latestDefinition || idx.definition
        })
      );
      return {
        output: { indexes },
        message: `Found **${indexes.length}** search index(es) on ${ctx.input.database}.${ctx.input.collectionName}.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.indexId) throw new Error('indexId is required');
      let idx = await client.getSearchIndex(
        projectId,
        ctx.input.clusterName,
        ctx.input.indexId
      );
      return {
        output: {
          index: {
            indexId: idx.indexID || idx.id,
            name: idx.name,
            clusterName: idx.clusterName,
            database: idx.database,
            collectionName: idx.collectionName,
            type: idx.type,
            status: idx.status,
            definition: idx.latestDefinition || idx.definition
          }
        },
        message: `Search index **${idx.name}**: ${idx.status}.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.database) throw new Error('database is required');
      if (!ctx.input.collectionName) throw new Error('collectionName is required');
      if (!ctx.input.name) throw new Error('name is required');
      let payload: any = {
        database: ctx.input.database,
        collectionName: ctx.input.collectionName,
        name: ctx.input.name
      };
      if (ctx.input.type) payload.type = ctx.input.type;
      if (ctx.input.definition) payload.definition = ctx.input.definition;

      let idx = await client.createSearchIndex(projectId, ctx.input.clusterName, payload);
      return {
        output: {
          index: {
            indexId: idx.indexID || idx.id,
            name: idx.name,
            database: idx.database,
            collectionName: idx.collectionName,
            type: idx.type,
            status: idx.status,
            definition: idx.latestDefinition || idx.definition
          }
        },
        message: `Created search index **${idx.name}** on ${ctx.input.database}.${ctx.input.collectionName}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.indexId) throw new Error('indexId is required');
      let payload: any = {};
      if (ctx.input.definition) payload.definition = ctx.input.definition;

      let idx = await client.updateSearchIndex(
        projectId,
        ctx.input.clusterName,
        ctx.input.indexId,
        payload
      );
      return {
        output: {
          index: {
            indexId: idx.indexID || idx.id,
            name: idx.name,
            database: idx.database,
            collectionName: idx.collectionName,
            type: idx.type,
            status: idx.status,
            definition: idx.latestDefinition || idx.definition
          }
        },
        message: `Updated search index **${idx.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.indexId) throw new Error('indexId is required');
      await client.deleteSearchIndex(projectId, ctx.input.clusterName, ctx.input.indexId);
      return {
        output: { deleted: true },
        message: `Deleted search index **${ctx.input.indexId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { elasticsearchServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageIndexTool = SlateTool.create(spec, {
  name: 'Manage Index',
  key: 'manage_index',
  description: `Create, configure, open, close, or delete an Elasticsearch index. Supports setting mappings, settings, aliases, and number of replicas/shards during creation. Can also update mappings and settings on existing indices.`,
  instructions: [
    'To create an index, provide the indexName and optionally mappings, settings, and aliases',
    'To update mappings or settings on an existing index, set the action to "update_mappings" or "update_settings"',
    'Use "open" or "close" actions to control index availability'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'delete', 'open', 'close', 'update_mappings', 'update_settings'])
        .describe('The index management action to perform'),
      indexName: z.string().describe('Name of the index'),
      mappings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Mapping definitions for create or update_mappings actions'),
      settings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Index settings for create or update_settings actions'),
      aliases: z
        .record(z.string(), z.any())
        .optional()
        .describe('Alias definitions for create action')
    })
  )
  .output(
    z.object({
      acknowledged: z.boolean().describe('Whether the request was acknowledged'),
      indexName: z.string().describe('The index that was operated on'),
      action: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    let result: any;

    switch (ctx.input.action) {
      case 'create': {
        let body: Record<string, any> = {};
        if (ctx.input.mappings) body.mappings = ctx.input.mappings;
        if (ctx.input.settings) body.settings = ctx.input.settings;
        if (ctx.input.aliases) body.aliases = ctx.input.aliases;
        result = await client.createIndex(ctx.input.indexName, body);
        break;
      }
      case 'delete':
        result = await client.deleteIndex(ctx.input.indexName);
        break;
      case 'open':
        result = await client.openIndex(ctx.input.indexName);
        break;
      case 'close':
        result = await client.closeIndex(ctx.input.indexName);
        break;
      case 'update_mappings':
        if (!ctx.input.mappings)
          throw elasticsearchServiceError('Mappings are required for update_mappings action');
        result = await client.putMapping(ctx.input.indexName, ctx.input.mappings);
        break;
      case 'update_settings':
        if (!ctx.input.settings)
          throw elasticsearchServiceError('Settings are required for update_settings action');
        result = await client.putSettings(ctx.input.indexName, ctx.input.settings);
        break;
    }

    return {
      output: {
        acknowledged: result.acknowledged ?? true,
        indexName: ctx.input.indexName,
        action: ctx.input.action
      },
      message: `Index **${ctx.input.indexName}** — action **${ctx.input.action}** completed successfully.`
    };
  })
  .build();

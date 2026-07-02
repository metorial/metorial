import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { elasticsearchServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageAliasTool = SlateTool.create(spec, {
  name: 'Manage Alias',
  key: 'manage_alias',
  description: `Create, delete, or list index aliases. Aliases provide alternative names for indices or groups of indices, enabling seamless index switching and multi-index queries.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete', 'list']).describe('The alias action to perform'),
      indexName: z.string().optional().describe('Index name (required for create and delete)'),
      aliasName: z.string().optional().describe('Alias name (required for create and delete)'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional filter query for the alias (create only)'),
      routing: z
        .string()
        .optional()
        .describe('Optional routing value for the alias (create only)')
    })
  )
  .output(
    z.object({
      acknowledged: z.boolean().optional().describe('Whether the request was acknowledged'),
      aliases: z
        .record(z.string(), z.any())
        .optional()
        .describe('Map of indices to their aliases (list only)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.indexName || !ctx.input.aliasName) {
          throw elasticsearchServiceError(
            'indexName and aliasName are required for create action'
          );
        }
        let body: Record<string, any> = {};
        if (ctx.input.filter) body.filter = ctx.input.filter;
        if (ctx.input.routing) body.routing = ctx.input.routing;
        let result = await client.putAlias(ctx.input.indexName, ctx.input.aliasName, body);
        return {
          output: { acknowledged: result.acknowledged ?? true },
          message: `Alias **${ctx.input.aliasName}** created for index **${ctx.input.indexName}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.indexName || !ctx.input.aliasName) {
          throw elasticsearchServiceError(
            'indexName and aliasName are required for delete action'
          );
        }
        let result = await client.deleteAlias(ctx.input.indexName, ctx.input.aliasName);
        return {
          output: { acknowledged: result.acknowledged ?? true },
          message: `Alias **${ctx.input.aliasName}** removed from index **${ctx.input.indexName}**.`
        };
      }
      case 'list': {
        let result = await client.getAliases(ctx.input.indexName);
        return {
          output: { aliases: result },
          message: `Retrieved aliases${ctx.input.indexName ? ` for index **${ctx.input.indexName}**` : ''}.`
        };
      }
    }
  })
  .build();

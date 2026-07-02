import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { vercelServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageEdgeConfigTool = SlateTool.create(spec, {
  name: 'Manage Edge Config',
  key: 'manage_edge_config',
  description: `Create, list, and manage Vercel Edge Config stores and their items. Edge Config provides ultra-low-latency key-value reads at the edge, useful for feature flags, A/B testing, and dynamic configuration.`,
  instructions: [
    'Use action "list" to list all Edge Config stores.',
    'Use action "get" to get details of a specific Edge Config store.',
    'Use action "create" to create a new Edge Config store.',
    'Use action "delete" to delete an Edge Config store.',
    'Use action "get_items" to read all items from an Edge Config store.',
    'Use action "update_items" to create, update, or delete items in an Edge Config store.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'delete', 'get_items', 'update_items'])
        .describe('Action to perform'),
      edgeConfigId: z
        .string()
        .optional()
        .describe('Edge Config ID (required for get, delete, get_items, update_items)'),
      slug: z.string().optional().describe('Edge Config slug/name (required for create)'),
      items: z
        .array(
          z.object({
            operation: z
              .enum(['create', 'update', 'upsert', 'delete'])
              .describe('Operation type'),
            key: z.string().describe('Item key'),
            value: z.any().optional().describe('Item value (not needed for delete)')
          })
        )
        .optional()
        .describe('Items to modify (for update_items)')
    })
  )
  .output(
    z.object({
      edgeConfigs: z
        .array(
          z.object({
            edgeConfigId: z.string().describe('Edge Config ID'),
            slug: z.string().optional().describe('Edge Config slug'),
            createdAt: z.number().optional().describe('Creation timestamp'),
            updatedAt: z.number().optional().describe('Last update timestamp'),
            itemCount: z.number().optional().describe('Number of items')
          })
        )
        .optional()
        .describe('List of Edge Config stores'),
      edgeConfig: z
        .object({
          edgeConfigId: z.string().describe('Edge Config ID'),
          slug: z.string().optional().describe('Edge Config slug'),
          createdAt: z.number().optional().describe('Creation timestamp'),
          itemCount: z.number().optional().describe('Number of items')
        })
        .optional()
        .describe('Edge Config details'),
      items: z
        .array(
          z.object({
            key: z.string().describe('Item key'),
            value: z.any().describe('Item value'),
            createdAt: z.number().optional().describe('Creation timestamp'),
            updatedAt: z.number().optional().describe('Last update timestamp')
          })
        )
        .optional()
        .describe('Edge Config items'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listEdgeConfigs();
      let edgeConfigs = (Array.isArray(result) ? result : []).map((ec: any) => ({
        edgeConfigId: ec.id,
        slug: ec.slug,
        createdAt: ec.createdAt,
        updatedAt: ec.updatedAt,
        itemCount: ec.itemCount
      }));
      return {
        output: { edgeConfigs, success: true },
        message: `Found **${edgeConfigs.length}** Edge Config store(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.edgeConfigId) throw vercelServiceError('edgeConfigId is required');
      let ec = await client.getEdgeConfig(ctx.input.edgeConfigId);
      return {
        output: {
          edgeConfig: {
            edgeConfigId: ec.id,
            slug: ec.slug,
            createdAt: ec.createdAt,
            itemCount: ec.itemCount
          },
          success: true
        },
        message: `Edge Config **${ec.slug}** (${ec.id}) has ${ec.itemCount || 0} items.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.slug) throw vercelServiceError('slug is required for create');
      let ec = await client.createEdgeConfig({ slug: ctx.input.slug });
      return {
        output: {
          edgeConfig: {
            edgeConfigId: ec.id,
            slug: ec.slug,
            createdAt: ec.createdAt
          },
          success: true
        },
        message: `Created Edge Config **${ec.slug}** (${ec.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.edgeConfigId) throw vercelServiceError('edgeConfigId is required');
      await client.deleteEdgeConfig(ctx.input.edgeConfigId);
      return {
        output: { success: true },
        message: `Deleted Edge Config **${ctx.input.edgeConfigId}**.`
      };
    }

    if (action === 'get_items') {
      if (!ctx.input.edgeConfigId) throw vercelServiceError('edgeConfigId is required');
      let result = await client.getEdgeConfigItems(ctx.input.edgeConfigId);
      let items = (Array.isArray(result) ? result : []).map((item: any) => ({
        key: item.key,
        value: item.value,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }));
      return {
        output: { items, success: true },
        message: `Found **${items.length}** item(s) in Edge Config.`
      };
    }

    if (action === 'update_items') {
      if (!ctx.input.edgeConfigId || !ctx.input.items) {
        throw vercelServiceError('edgeConfigId and items are required');
      }
      await client.updateEdgeConfigItems(ctx.input.edgeConfigId, ctx.input.items);
      return {
        output: { success: true },
        message: `Updated **${ctx.input.items.length}** item(s) in Edge Config.`
      };
    }

    throw vercelServiceError(`Unknown action: ${action}`);
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLayer = SlateTool.create(spec, {
  name: 'Manage Layer',
  key: 'manage_layer',
  description: `Update, style, refresh, or delete a layer on a Felt map. Use this to rename a layer, change its legend settings, update its style using the Felt Style Language (FSL), trigger a data refresh for live layers, or remove a layer entirely.`,
  instructions: [
    'To update properties like name or caption, provide the fields to change.',
    'To update the layer style, provide the FSL style object.',
    'To refresh a live data layer, set refresh to true.',
    'To delete a layer, set delete to true.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mapId: z.string().describe('ID of the map containing the layer'),
      layerId: z.string().describe('ID of the layer to manage'),
      name: z.string().optional().describe('New name for the layer'),
      caption: z.string().optional().describe('New caption for the layer'),
      layerGroupId: z.string().optional().describe('Layer group ID to assign the layer to'),
      orderingKey: z.string().optional().describe('Ordering key for layer position'),
      refreshPeriod: z
        .string()
        .optional()
        .describe('Refresh schedule (e.g. "15 min", "hour", "day", "disabled")'),
      legendVisibility: z.string().optional().describe('Legend visibility setting'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Layer metadata (attribution, source, description, etc.)'),
      style: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Felt Style Language (FSL) style object'),
      refresh: z
        .boolean()
        .optional()
        .describe('Set to true to trigger a data refresh for live layers'),
      delete: z.boolean().optional().describe('Set to true to delete the layer')
    })
  )
  .output(
    z.object({
      layerId: z.string().describe('ID of the layer'),
      action: z.string().describe('Action performed (updated, styled, refreshed, deleted)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { mapId, layerId } = ctx.input;

    if (ctx.input.delete) {
      await client.deleteLayer(mapId, layerId);
      return {
        output: { layerId, action: 'deleted' },
        message: `Deleted layer \`${layerId}\` from map \`${mapId}\`.`
      };
    }

    let actions: string[] = [];

    // Update properties
    let hasPropertyUpdate =
      ctx.input.name !== undefined ||
      ctx.input.caption !== undefined ||
      ctx.input.layerGroupId !== undefined ||
      ctx.input.orderingKey !== undefined ||
      ctx.input.refreshPeriod !== undefined ||
      ctx.input.legendVisibility !== undefined ||
      ctx.input.metadata !== undefined;

    if (hasPropertyUpdate) {
      await client.updateLayers(mapId, [
        {
          id: layerId,
          name: ctx.input.name,
          caption: ctx.input.caption,
          layerGroupId: ctx.input.layerGroupId,
          ordering_key: ctx.input.orderingKey,
          refreshPeriod: ctx.input.refreshPeriod,
          legendVisibility: ctx.input.legendVisibility,
          metadata: ctx.input.metadata
        }
      ]);
      actions.push('updated');
    }

    // Update style
    if (ctx.input.style) {
      await client.updateLayerStyle(mapId, layerId, ctx.input.style);
      actions.push('styled');
    }

    // Refresh
    if (ctx.input.refresh) {
      await client.refreshLayer(mapId, layerId);
      actions.push('refreshed');
    }

    let action = actions.length > 0 ? actions.join(', ') : 'no changes';

    return {
      output: { layerId, action },
      message: `Layer \`${layerId}\`: ${action}.`
    };
  })
  .build();

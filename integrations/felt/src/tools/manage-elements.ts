import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageElements = SlateTool.create(spec, {
  name: 'Manage Elements',
  key: 'manage_elements',
  description: `Create, update, or delete annotation elements on a Felt map. Elements are GeoJSON features including points, lines, polygons, notes, and text.

To **create or update** elements, provide a GeoJSON FeatureCollection. Include an existing element ID in a feature to update it; omit the ID to create a new element.

To **delete** a single element, provide the element ID to remove.`,
  constraints: [
    'Maximum payload size is 1MB. Complex geometries may be automatically simplified.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mapId: z.string().describe('ID of the map'),
      featureCollection: z
        .object({
          type: z.literal('FeatureCollection'),
          features: z
            .array(z.record(z.string(), z.unknown()))
            .describe('GeoJSON Feature objects')
        })
        .optional()
        .describe('GeoJSON FeatureCollection to create or update elements'),
      deleteElementId: z.string().optional().describe('ID of a single element to delete')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Action performed'),
      elements: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Resulting elements (GeoJSON FeatureCollection) or null for delete')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.deleteElementId) {
      await client.deleteElement(ctx.input.mapId, ctx.input.deleteElementId);
      return {
        output: { action: 'deleted', elements: null },
        message: `Deleted element \`${ctx.input.deleteElementId}\` from map \`${ctx.input.mapId}\`.`
      };
    }

    if (ctx.input.featureCollection) {
      let result = await client.createOrUpdateElements(
        ctx.input.mapId,
        ctx.input.featureCollection
      );
      let count = ctx.input.featureCollection.features.length;
      return {
        output: { action: 'upserted', elements: result },
        message: `Created/updated **${count}** element(s) on map \`${ctx.input.mapId}\`.`
      };
    }

    return {
      output: { action: 'none', elements: null },
      message: 'No action taken — provide featureCollection or deleteElementId.'
    };
  })
  .build();

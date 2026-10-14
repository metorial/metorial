import { SlateTool } from 'slates';
import { z } from 'zod';
import { TigerwebClient } from '../lib/client';
import { spec } from '../spec';

export let getBoundaryLayers = SlateTool.create(spec, {
  name: 'Get Boundary Layers',
  key: 'get_boundary_layers',
  description:
    'Discover geographic layers in a Census TIGERweb map service. Optionally inspect a layer to find its attribute fields, geometry type, maximum record count, and pagination support before querying boundaries.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      serviceName: z
        .string()
        .optional()
        .describe('TIGERweb service path (default: TIGERweb/tigerWMS_Current)'),
      layerId: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Layer ID from this tool to inspect in detail; omit to list layers')
    })
  )
  .output(
    z.object({
      serviceName: z
        .string()
        .describe('Map service path to use with Query Geographic Boundaries'),
      description: z.string().optional().describe('Map service description and vintage'),
      maxRecordCount: z
        .number()
        .optional()
        .describe('Default maximum record count for the service'),
      layers: z.array(
        z.object({
          id: z.number().describe('Layer ID to use with Query Geographic Boundaries'),
          name: z.string().describe('Layer name'),
          parentLayerId: z
            .number()
            .optional()
            .describe('Parent group layer ID, or -1 for a top-level layer'),
          subLayerIds: z
            .array(z.number())
            .nullable()
            .optional()
            .describe('Child layer IDs for group layers'),
          defaultVisibility: z
            .boolean()
            .optional()
            .describe('Whether the layer is visible by default')
        })
      ),
      layer: z
        .object({
          id: z.number().describe('Selected layer ID'),
          name: z.string().describe('Selected layer name'),
          type: z
            .string()
            .optional()
            .describe('Layer type, such as Feature Layer or Group Layer'),
          description: z.string().optional().describe('Layer description and vintage'),
          geometryType: z
            .string()
            .optional()
            .describe('Geometry type returned by layer queries'),
          maxRecordCount: z
            .number()
            .optional()
            .describe('Maximum records returned in one layer query'),
          objectIdField: z.string().optional().describe('Unique object ID field'),
          supportsPagination: z
            .boolean()
            .optional()
            .describe('Whether resultOffset and maxResults pagination is supported'),
          fields: z
            .array(
              z.object({
                name: z.string().describe('Field name for where filters and outFields'),
                type: z.string().describe('Provider field type'),
                alias: z.string().optional().describe('Human-readable field label')
              })
            )
            .optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let serviceName = ctx.input.serviceName ?? 'TIGERweb/tigerWMS_Current';
    let client = new TigerwebClient();
    let service = await client.getServiceInfo(serviceName);
    let layer =
      ctx.input.layerId !== undefined
        ? await client.getLayerInfo(serviceName, ctx.input.layerId)
        : undefined;
    return {
      output: {
        serviceName,
        description: service.serviceDescription || service.description,
        maxRecordCount: service.maxRecordCount,
        layers: service.layers.map(layer => ({
          id: layer.id,
          name: layer.name,
          parentLayerId: layer.parentLayerId,
          subLayerIds: layer.subLayerIds,
          defaultVisibility: layer.defaultVisibility
        })),
        layer: layer
          ? {
              id: layer.id,
              name: layer.name,
              type: layer.type,
              description: layer.description,
              geometryType: layer.geometryType,
              maxRecordCount: layer.maxRecordCount,
              objectIdField: layer.objectIdField,
              supportsPagination: layer.advancedQueryCapabilities?.supportsPagination,
              fields: layer.fields?.map(field => ({
                name: field.name,
                type: field.type,
                alias: field.alias
              }))
            }
          : undefined
      },
      message: `Found **${service.layers.length}** layers in ${serviceName}${layer ? `; inspected **${layer.name}** (${layer.id})` : ''}.`
    };
  })
  .build();

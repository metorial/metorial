import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { TigerwebClient } from '../lib/client';
import { spec } from '../spec';

export let queryTigerweb = SlateTool.create(spec, {
  name: 'Query Geographic Boundaries',
  key: 'query_geographic_boundaries',
  description: `Query Census geographic boundaries and shapes from the TIGERweb GeoServices REST API. Retrieve boundary features for states, counties, tracts, and other Census geographic areas by FIPS code or spatial location.

Common service names:
- **TIGERweb/tigerWMS_Current** — Current TIGER/Line boundaries
- **TIGERweb/tigerWMS_ACS2022** — ACS 2022 vintage boundaries
- **TIGERweb/tigerWMS_Census2020** — Census 2020 boundaries

Layer IDs vary by service and vintage. Use Get Boundary Layers to discover the correct layer ID and available attribute fields.`,
  instructions: [
    'Use the `where` clause with SQL-like syntax to filter by attributes (e.g., "STATE=\'06\'" for California).',
    'For point-in-polygon queries, provide longitude/latitude as geometry.',
    'Set returnGeometry to false if you only need attribute data without shapes to improve performance.',
    'When exceededTransferLimit is true, continue with the same filters and increase resultOffset by maxResults; inspect Get Boundary Layers for pagination support.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceName: z
        .string()
        .describe('TIGERweb service name (e.g., "TIGERweb/tigerWMS_Current")'),
      layerId: z
        .number()
        .describe(
          'Layer ID within the service. Call Get Boundary Layers to discover valid IDs.'
        ),
      where: z
        .string()
        .optional()
        .describe(
          'SQL-like WHERE clause filter (e.g., "STATE=\'06\'", "NAME=\'California\'")'
        ),
      longitude: z
        .number()
        .optional()
        .describe('Longitude for spatial/point-in-polygon query'),
      latitude: z.number().optional().describe('Latitude for spatial/point-in-polygon query'),
      outFields: z
        .string()
        .optional()
        .describe('Comma-separated list of fields to return (default: all fields "*")'),
      returnGeometry: z
        .boolean()
        .optional()
        .describe('Whether to include geometry/shapes in response (default: true)'),
      maxResults: z
        .number()
        .optional()
        .describe(
          'Maximum number of features to return; must be a positive whole number and is subject to the layer record limit'
        ),
      resultOffset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Records to skip for pagination on layers that support it (default: 0)')
    })
  )
  .output(
    z.object({
      features: z
        .array(
          z.object({
            attributes: z
              .record(z.string(), z.any())
              .describe('Feature attribute values (FIPS codes, names, etc.)'),
            geometry: z
              .any()
              .optional()
              .describe('Feature geometry (rings/points for the boundary shape)')
          })
        )
        .describe('Geographic features matching the query'),
      totalFeatures: z.number().describe('Number of features returned'),
      geometryType: z
        .string()
        .optional()
        .describe('Type of geometry returned (e.g., esriGeometryPolygon)'),
      spatialReference: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Coordinate reference system of returned shapes'),
      exceededTransferLimit: z
        .boolean()
        .optional()
        .describe(
          'True when additional results are available or the server record limit was reached'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new TigerwebClient();
    if (!Number.isInteger(ctx.input.layerId) || ctx.input.layerId < 0) {
      throw createApiServiceError(
        'Use a non-negative whole-number layer ID from Get Boundary Layers.'
      );
    }
    if (
      ctx.input.maxResults !== undefined &&
      (!Number.isInteger(ctx.input.maxResults) || ctx.input.maxResults < 1)
    ) {
      throw createApiServiceError('maxResults must be a positive whole number.');
    }
    if ((ctx.input.longitude !== undefined) !== (ctx.input.latitude !== undefined)) {
      throw createApiServiceError('Provide both longitude and latitude for a spatial query.');
    }
    if (
      (ctx.input.longitude !== undefined &&
        (!Number.isFinite(ctx.input.longitude) || Math.abs(ctx.input.longitude) > 180)) ||
      (ctx.input.latitude !== undefined &&
        (!Number.isFinite(ctx.input.latitude) || Math.abs(ctx.input.latitude) > 90))
    ) {
      throw createApiServiceError(
        'Longitude must be between -180 and 180, and latitude between -90 and 90.'
      );
    }

    let geometry: string | undefined;
    if (ctx.input.longitude !== undefined && ctx.input.latitude !== undefined) {
      geometry = JSON.stringify({
        x: ctx.input.longitude,
        y: ctx.input.latitude,
        spatialReference: { wkid: 4326 }
      });
    }

    let result = await client.queryLayer({
      serviceName: ctx.input.serviceName,
      layerId: ctx.input.layerId,
      where: ctx.input.where,
      geometry,
      geometryType: geometry ? 'esriGeometryPoint' : undefined,
      spatialRel: geometry ? 'esriSpatialRelIntersects' : undefined,
      outFields: ctx.input.outFields,
      returnGeometry: ctx.input.returnGeometry,
      resultRecordCount: ctx.input.maxResults,
      resultOffset: ctx.input.resultOffset
    });

    let features = result.features.map(f => ({
      attributes: f.attributes || {},
      geometry: f.geometry || undefined
    }));

    return {
      output: {
        features,
        totalFeatures: features.length,
        geometryType: result.geometryType || undefined,
        spatialReference: result.spatialReference,
        exceededTransferLimit: result.exceededTransferLimit
      },
      message: `Retrieved **${features.length}** geographic features from layer ${ctx.input.layerId} of ${ctx.input.serviceName}.`
    };
  })
  .build();

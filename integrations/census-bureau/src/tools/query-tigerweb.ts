import { SlateTool } from 'slates';
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

Common layer IDs (vary by service):
- **0–4**: States, counties
- **6–14**: Tracts, block groups, blocks
- **24–38**: Congressional districts, school districts
- **44–54**: Metropolitan/micropolitan areas, urban areas`,
  instructions: [
    'Use the `where` clause with SQL-like syntax to filter by attributes (e.g., "STATE=\'06\'" for California).',
    'For point-in-polygon queries, provide longitude/latitude as geometry.',
    'Set returnGeometry to false if you only need attribute data without shapes to improve performance.'
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
        .describe('Layer ID within the service (e.g., 0 for states, 2 for counties)'),
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
      maxResults: z.number().optional().describe('Maximum number of features to return')
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
        .describe('Type of geometry returned (e.g., esriGeometryPolygon)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TigerwebClient();

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
      resultRecordCount: ctx.input.maxResults
    });

    let features = (result.features || []).map((f: any) => ({
      attributes: f.attributes || {},
      geometry: f.geometry || undefined
    }));

    return {
      output: {
        features,
        totalFeatures: features.length,
        geometryType: result.geometryType || undefined
      },
      message: `Retrieved **${features.length}** geographic features from layer ${ctx.input.layerId} of ${ctx.input.serviceName}.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

let featureSchema = z.object({
  featureId: z.string().optional().describe('Feature ID'),
  type: z.string().optional().describe('GeoJSON type (always "Feature")'),
  geometry: z.any().optional().describe('GeoJSON geometry object'),
  properties: z.record(z.string(), z.any()).optional().describe('Feature properties')
});

export let manageDatasetFeaturesTool = SlateTool.create(spec, {
  name: 'Manage Dataset Features',
  key: 'manage_dataset_features',
  description: `List, retrieve, create/update, or delete GeoJSON features within a Mapbox dataset. Features are individual geographic entities (points, lines, polygons) stored as GeoJSON within a dataset.`,
  instructions: [
    'Use action "list" to see all features in a dataset.',
    'Use action "get" to retrieve a specific feature by ID.',
    'Use action "upsert" to create or replace a feature — provide featureId, geometry, and properties.',
    'Geometry should be a valid GeoJSON geometry object (e.g., {"type": "Point", "coordinates": [-73.99, 40.73]}).'
  ],
  constraints: [
    'Requires datasets:read and datasets:write token scopes.',
    'Feature IDs must be unique within a dataset.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'upsert', 'delete']).describe('Operation to perform'),
      datasetId: z.string().describe('Dataset ID containing the features'),
      featureId: z
        .string()
        .optional()
        .describe('Feature ID (required for get, upsert, delete)'),
      geometry: z.any().optional().describe('GeoJSON geometry object (for upsert)'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Feature properties (for upsert)'),
      limit: z.number().optional().describe('Max features to return (for list)'),
      start: z.string().optional().describe('Pagination start feature ID (for list)')
    })
  )
  .output(
    z.object({
      feature: featureSchema.optional().describe('Feature details (for get/upsert)'),
      features: z.array(featureSchema).optional().describe('List of features (for list)'),
      deleted: z.boolean().optional().describe('Whether the feature was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapboxClient({
      token: ctx.auth.token,
      username: ctx.config.username
    });

    let { action, datasetId } = ctx.input;

    let mapFeature = (f: any) => ({
      featureId: f.id,
      type: f.type,
      geometry: f.geometry,
      properties: f.properties
    });

    if (action === 'list') {
      let result = await client.listFeatures(datasetId, {
        limit: ctx.input.limit,
        start: ctx.input.start
      });
      let features = (result.features || []).map(mapFeature);
      return {
        output: { features },
        message: `Found **${features.length}** feature${features.length !== 1 ? 's' : ''} in dataset ${datasetId}.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.featureId) throw new Error('featureId is required for get');
      let f = await client.getFeature(datasetId, ctx.input.featureId);
      return {
        output: { feature: mapFeature(f) },
        message: `Retrieved feature **${ctx.input.featureId}** from dataset ${datasetId}.`
      };
    }

    if (action === 'upsert') {
      if (!ctx.input.featureId) throw new Error('featureId is required for upsert');
      let featureBody: Record<string, any> = {
        id: ctx.input.featureId,
        type: 'Feature',
        geometry: ctx.input.geometry,
        properties: ctx.input.properties || {}
      };
      let f = await client.upsertFeature(datasetId, ctx.input.featureId, featureBody);
      return {
        output: { feature: mapFeature(f) },
        message: `Upserted feature **${ctx.input.featureId}** in dataset ${datasetId}.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.featureId) throw new Error('featureId is required for delete');
      await client.deleteFeature(datasetId, ctx.input.featureId);
      return {
        output: { deleted: true },
        message: `Deleted feature **${ctx.input.featureId}** from dataset ${datasetId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  });

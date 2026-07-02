import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

let tilesetSchema = z.object({
  tilesetId: z.string().optional().describe('Tileset ID (username.tilesetname)'),
  name: z.string().optional().describe('Tileset name'),
  description: z.string().optional().describe('Tileset description'),
  type: z.string().optional().describe('Tileset type (vector or raster)'),
  visibility: z.string().optional().describe('Visibility (public or private)'),
  created: z.string().optional().describe('Creation timestamp'),
  modified: z.string().optional().describe('Last modified timestamp'),
  center: z.array(z.number()).optional().describe('Center coordinates [lon, lat, zoom]'),
  bounds: z
    .array(z.number())
    .optional()
    .describe('Bounding box [minLon, minLat, maxLon, maxLat]'),
  minzoom: z.number().optional().describe('Minimum zoom level'),
  maxzoom: z.number().optional().describe('Maximum zoom level'),
  filesize: z.number().optional().describe('Tileset size in bytes')
});

export let manageTilesetsTool = SlateTool.create(spec, {
  name: 'Manage Tilesets',
  key: 'manage_tilesets',
  description: `List tilesets, retrieve tileset metadata (TileJSON), view tileset processing jobs, publish tilesets, or delete tilesets. Tilesets are collections of raster or vector data broken into a grid of tiles for efficient map rendering.`,
  instructions: [
    'Use action "list" to see all tilesets in your account.',
    'Use action "metadata" to get TileJSON metadata for a specific tileset.',
    'Use action "publish" to publish a tileset after uploading or updating its recipe.',
    'Use action "jobs" to view processing jobs for a tileset.',
    'Use action "recipe" to view the current recipe for a tileset.',
    'Tileset IDs follow the format "username.tilesetname".'
  ],
  constraints: ['Delete operations are permanent and cannot be undone.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'metadata', 'delete', 'publish', 'jobs', 'recipe'])
        .describe('Operation to perform'),
      tilesetId: z
        .string()
        .optional()
        .describe(
          'Tileset ID in "username.tilesetname" format (required for metadata, delete, publish, jobs, recipe)'
        ),
      type: z.string().optional().describe('Filter by type: "vector" or "raster" (for list)'),
      visibility: z
        .string()
        .optional()
        .describe('Filter by visibility: "public" or "private" (for list)'),
      sortby: z.string().optional().describe('Sort field: "created" or "modified" (for list)'),
      limit: z.number().optional().describe('Max results to return (for list/jobs)'),
      jobStage: z
        .string()
        .optional()
        .describe(
          'Filter jobs by stage: "processing", "queued", "complete", "failed" (for jobs)'
        )
    })
  )
  .output(
    z.object({
      tileset: tilesetSchema.optional().describe('Tileset metadata (for metadata)'),
      tilesets: z.array(tilesetSchema).optional().describe('List of tilesets (for list)'),
      jobs: z
        .array(
          z.object({
            jobId: z.string().optional().describe('Job ID'),
            stage: z.string().optional().describe('Job stage'),
            created: z.string().optional().describe('Job creation timestamp'),
            tilesetId: z.string().optional().describe('Associated tileset ID')
          })
        )
        .optional()
        .describe('Tileset processing jobs (for jobs)'),
      recipe: z.any().optional().describe('Tileset recipe (for recipe)'),
      published: z.boolean().optional().describe('Whether the tileset was published'),
      deleted: z.boolean().optional().describe('Whether the tileset was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapboxClient({
      token: ctx.auth.token,
      username: ctx.config.username
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let tilesets = await client.listTilesets({
        type: ctx.input.type,
        visibility: ctx.input.visibility,
        sortby: ctx.input.sortby,
        limit: ctx.input.limit
      });
      let mapped = (tilesets || []).map((t: any) => ({
        tilesetId: t.id,
        name: t.name,
        description: t.description,
        type: t.type,
        visibility: t.visibility,
        created: t.created,
        modified: t.modified,
        center: t.center,
        bounds: t.bounds,
        minzoom: t.minzoom,
        maxzoom: t.maxzoom,
        filesize: t.filesize
      }));
      return {
        output: { tilesets: mapped },
        message: `Found **${mapped.length}** tileset${mapped.length !== 1 ? 's' : ''}.`
      };
    }

    if (action === 'metadata') {
      if (!ctx.input.tilesetId) throw new Error('tilesetId is required for metadata');
      let meta = await client.getTilesetMetadata(ctx.input.tilesetId);
      return {
        output: {
          tileset: {
            tilesetId: meta.id || ctx.input.tilesetId,
            name: meta.name,
            description: meta.description,
            center: meta.center,
            bounds: meta.bounds,
            minzoom: meta.minzoom,
            maxzoom: meta.maxzoom
          }
        },
        message: `Retrieved metadata for tileset **${ctx.input.tilesetId}**.`
      };
    }

    if (action === 'publish') {
      if (!ctx.input.tilesetId) throw new Error('tilesetId is required for publish');
      await client.publishTileset(ctx.input.tilesetId);
      return {
        output: { published: true },
        message: `Published tileset **${ctx.input.tilesetId}**.`
      };
    }

    if (action === 'jobs') {
      if (!ctx.input.tilesetId) throw new Error('tilesetId is required for jobs');
      let jobs = await client.listTilesetJobs(ctx.input.tilesetId, {
        stage: ctx.input.jobStage,
        limit: ctx.input.limit
      });
      let mapped = (jobs || []).map((j: any) => ({
        jobId: j.id,
        stage: j.stage,
        created: j.created,
        tilesetId: j.tilesetId
      }));
      return {
        output: { jobs: mapped },
        message: `Found **${mapped.length}** job${mapped.length !== 1 ? 's' : ''} for tileset **${ctx.input.tilesetId}**.`
      };
    }

    if (action === 'recipe') {
      if (!ctx.input.tilesetId) throw new Error('tilesetId is required for recipe');
      let recipe = await client.getTilesetRecipe(ctx.input.tilesetId);
      return {
        output: { recipe },
        message: `Retrieved recipe for tileset **${ctx.input.tilesetId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.tilesetId) throw new Error('tilesetId is required for delete');
      await client.deleteTileset(ctx.input.tilesetId);
      return {
        output: { deleted: true },
        message: `Deleted tileset **${ctx.input.tilesetId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  });

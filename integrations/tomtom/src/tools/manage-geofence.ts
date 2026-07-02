import { SlateTool } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

export let createGeofence = SlateTool.create(spec, {
  name: 'Create Geofence',
  key: 'create_geofence',
  description: `Create a geofence (virtual boundary) within a project. Supports circle, polygon, corridor, and rectangle shapes. Geofences are used to detect when tracked objects enter, exit, or dwell within defined areas.`,
  instructions: [
    'For circles: provide centerLat, centerLon, and radiusInMeters',
    'For polygons: provide an array of coordinates forming the boundary (will be auto-closed)',
    'For corridors: provide coordinates along the path and widthInMeters',
    'For rectangles: provide exactly 4 corner coordinates'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the parent project'),
      fenceName: z.string().describe('Name for the geofence'),
      fenceType: z
        .enum(['circle', 'polygon', 'corridor', 'rectangle'])
        .describe('Shape of the geofence'),
      centerLat: z.number().optional().describe('Center latitude (for circle type)'),
      centerLon: z.number().optional().describe('Center longitude (for circle type)'),
      radiusInMeters: z.number().optional().describe('Radius in meters (for circle type)'),
      coordinates: z
        .array(
          z.object({
            lat: z.number().describe('Latitude'),
            lon: z.number().describe('Longitude')
          })
        )
        .optional()
        .describe('Boundary coordinates (for polygon, corridor, rectangle types)'),
      widthInMeters: z
        .number()
        .optional()
        .describe('Corridor width in meters (for corridor type)')
    })
  )
  .output(
    z.object({
      fenceId: z.string().describe('ID of the created geofence'),
      fenceName: z.string().optional().describe('Name of the created geofence')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.createFence({
      projectId: ctx.input.projectId,
      name: ctx.input.fenceName,
      type: ctx.input.fenceType,
      centerLat: ctx.input.centerLat,
      centerLon: ctx.input.centerLon,
      radius: ctx.input.radiusInMeters,
      coordinates: ctx.input.coordinates,
      widthInMeters: ctx.input.widthInMeters
    });

    return {
      output: {
        fenceId: data.id || data.fenceId,
        fenceName: data.name || ctx.input.fenceName
      },
      message: `Created **${ctx.input.fenceType}** geofence **${ctx.input.fenceName}** in project \`${ctx.input.projectId}\`.`
    };
  })
  .build();

export let listGeofences = SlateTool.create(spec, {
  name: 'List Geofences',
  key: 'list_geofences',
  description: `List all geofences within a project. Returns fence IDs, names, and geometry information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to list fences for')
    })
  )
  .output(
    z.object({
      fences: z
        .array(
          z.object({
            fenceId: z.string().describe('Fence unique identifier'),
            fenceName: z.string().optional().describe('Fence name'),
            geometryType: z
              .string()
              .optional()
              .describe('Geometry type (Point, Polygon, LineString)')
          })
        )
        .describe('List of geofences in the project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.listFences(ctx.input.projectId);
    let fences = (data.fences || data || []).map((f: any) => ({
      fenceId: f.id || f.fenceId,
      fenceName: f.name,
      geometryType: f.geometry?.type
    }));

    return {
      output: { fences },
      message: `Found **${fences.length}** geofence(s) in project \`${ctx.input.projectId}\`.`
    };
  })
  .build();

export let deleteGeofence = SlateTool.create(spec, {
  name: 'Delete Geofence',
  key: 'delete_geofence',
  description: `Delete a geofence from a project.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the parent project'),
      fenceId: z.string().describe('ID of the geofence to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the geofence was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    await client.deleteFence({
      projectId: ctx.input.projectId,
      fenceId: ctx.input.fenceId
    });

    return {
      output: { deleted: true },
      message: `Deleted geofence \`${ctx.input.fenceId}\` from project \`${ctx.input.projectId}\`.`
    };
  })
  .build();

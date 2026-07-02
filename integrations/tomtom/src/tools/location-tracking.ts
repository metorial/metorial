import { SlateTool } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

export let reportLocation = SlateTool.create(spec, {
  name: 'Report Object Location',
  key: 'report_object_location',
  description: `Report a position update for a tracked object. Records the location in the object's history and can trigger geofence transitions when combined with the Geofencing service.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      objectId: z.string().describe('ID of the tracked object'),
      lat: z.number().describe('Current latitude'),
      lon: z.number().describe('Current longitude'),
      timestamp: z
        .string()
        .optional()
        .describe('Position timestamp in ISO 8601 format (defaults to now)'),
      speed: z.number().optional().describe('Current speed in km/h'),
      heading: z.number().optional().describe('Heading in degrees (0-359)')
    })
  )
  .output(
    z.object({
      recorded: z.boolean().describe('Whether the position was successfully recorded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    await client.reportObjectLocation({
      objectId: ctx.input.objectId,
      lat: ctx.input.lat,
      lon: ctx.input.lon,
      timestamp: ctx.input.timestamp,
      speed: ctx.input.speed,
      heading: ctx.input.heading
    });

    return {
      output: { recorded: true },
      message: `Recorded position (${ctx.input.lat}, ${ctx.input.lon}) for object \`${ctx.input.objectId}\`.`
    };
  })
  .build();

export let getLocationHistory = SlateTool.create(spec, {
  name: 'Get Location History',
  key: 'get_location_history',
  description: `Retrieve the position history for a tracked object. Returns a chronological list of recorded positions within an optional time range. Useful for fleet tracking and route analysis.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectId: z.string().describe('ID of the tracked object'),
      from: z.string().optional().describe('Start of time range in ISO 8601 format'),
      to: z.string().optional().describe('End of time range in ISO 8601 format')
    })
  )
  .output(
    z.object({
      positions: z
        .array(
          z.object({
            lat: z.number().describe('Latitude'),
            lon: z.number().describe('Longitude'),
            timestamp: z.string().optional().describe('Position timestamp'),
            speed: z.number().optional().describe('Speed in km/h'),
            heading: z.number().optional().describe('Heading in degrees')
          })
        )
        .describe('Recorded positions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.getObjectLocationHistory({
      objectId: ctx.input.objectId,
      from: ctx.input.from,
      to: ctx.input.to
    });

    let positions = (data.positions || []).map((p: any) => ({
      lat: p.position?.latitude || p.latitude || p.lat,
      lon: p.position?.longitude || p.longitude || p.lon,
      timestamp: p.timestamp,
      speed: p.speed,
      heading: p.heading
    }));

    return {
      output: { positions },
      message: `Retrieved **${positions.length}** position(s) for object \`${ctx.input.objectId}\`.`
    };
  })
  .build();

export let listTrackedObjects = SlateTool.create(spec, {
  name: 'List Tracked Objects',
  key: 'list_tracked_objects',
  description: `List all tracked objects in the Location History service. Objects represent entities (vehicles, devices, etc.) whose positions are being tracked.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      objects: z
        .array(
          z.object({
            objectId: z.string().describe('Object unique identifier'),
            objectName: z.string().optional().describe('Object name')
          })
        )
        .describe('List of tracked objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.listObjects();
    let objects = (data.objects || data || []).map((o: any) => ({
      objectId: o.id || o.objectId,
      objectName: o.name
    }));

    return {
      output: { objects },
      message: `Found **${objects.length}** tracked object(s).`
    };
  })
  .build();

export let createTrackedObject = SlateTool.create(spec, {
  name: 'Create Tracked Object',
  key: 'create_tracked_object',
  description: `Create a new tracked object in the Location History service. Once created, positions can be reported for this object.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      objectName: z
        .string()
        .describe('Name for the tracked object (e.g. vehicle ID, device name)')
    })
  )
  .output(
    z.object({
      objectId: z.string().describe('ID of the created object'),
      objectName: z.string().optional().describe('Name of the created object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.createObject({ objectName: ctx.input.objectName });

    return {
      output: {
        objectId: data.id || data.objectId,
        objectName: data.name || ctx.input.objectName
      },
      message: `Created tracked object **${ctx.input.objectName}**.`
    };
  })
  .build();

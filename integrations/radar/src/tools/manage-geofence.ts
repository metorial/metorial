import { SlateTool } from 'slates';
import { z } from 'zod';
import { RadarClient } from '../lib/client';
import { spec } from '../spec';

let geofenceSchema = z.object({
  geofenceId: z.string().describe('Radar internal geofence ID'),
  tag: z.string().optional().describe('Geofence tag (group)'),
  externalId: z.string().optional().describe('External ID mapping to your internal database'),
  description: z.string().optional().describe('Geofence description'),
  type: z.string().optional().describe('Geofence type: circle, polygon, or isochrone'),
  enabled: z.boolean().optional().describe('Whether the geofence generates events'),
  metadata: z.record(z.string(), z.string()).optional().describe('Custom key-value metadata'),
  geometryCenter: z.any().optional().describe('Center point of the geofence geometry'),
  geometryRadius: z.number().optional().describe('Radius of the geofence in meters'),
  createdAt: z.string().optional().describe('When the geofence was created'),
  updatedAt: z.string().optional().describe('When the geofence was last updated')
});

export let upsertGeofenceTool = SlateTool.create(spec, {
  name: 'Upsert Geofence',
  key: 'upsert_geofence',
  description: `Create or update a geofence in Radar. Geofences can be circles, polygons, or isochrones (time-based). Each geofence is identified by a **tag** (group name) and **externalId** pair — if a geofence with the same tag/externalId already exists, it will be updated.`,
  instructions: [
    'For circle geofences, provide coordinates as [longitude, latitude] and a radius in meters (10-10,000).',
    'For polygon geofences, provide coordinates as [[lng0,lat0],[lng1,lat1],...,[lng0,lat0]] — the first and last points must match.',
    'For isochrone geofences, provide coordinates as [longitude, latitude] and radius in minutes.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      tag: z
        .string()
        .describe(
          'Geofence tag (group name). Used with externalId to uniquely identify the geofence.'
        ),
      externalId: z
        .string()
        .describe(
          'External ID mapping to your internal database. Used with tag to uniquely identify the geofence.'
        ),
      description: z.string().describe('Description for the geofence'),
      type: z.enum(['circle', 'polygon', 'isochrone']).describe('Geofence type'),
      coordinates: z
        .union([
          z.array(z.number()).describe('[longitude, latitude] for circle or isochrone'),
          z.array(z.array(z.number())).describe('Array of [lng, lat] pairs for polygon')
        ])
        .describe('Geofence coordinates'),
      radius: z
        .number()
        .optional()
        .describe('Radius in meters (circle, 10-10000) or minutes (isochrone)'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata'),
      enabled: z.boolean().optional().describe('Whether the geofence generates events'),
      userId: z.string().optional().describe('Restrict events to a specific user'),
      disableAfter: z
        .string()
        .optional()
        .describe('ISO 8601 datetime to auto-disable the geofence')
    })
  )
  .output(geofenceSchema)
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let result = await client.upsertGeofence(ctx.input.tag, ctx.input.externalId, {
      description: ctx.input.description,
      type: ctx.input.type,
      coordinates: ctx.input.coordinates,
      radius: ctx.input.radius,
      metadata: ctx.input.metadata,
      enabled: ctx.input.enabled,
      userId: ctx.input.userId,
      disableAfter: ctx.input.disableAfter
    });

    let geofence = result.geofence;
    return {
      output: {
        geofenceId: geofence._id,
        tag: geofence.tag,
        externalId: geofence.externalId,
        description: geofence.description,
        type: geofence.type,
        enabled: geofence.enabled,
        metadata: geofence.metadata,
        geometryCenter: geofence.geometryCenter,
        geometryRadius: geofence.geometryRadius,
        createdAt: geofence.createdAt,
        updatedAt: geofence.updatedAt
      },
      message: `Geofence **${geofence.tag}/${geofence.externalId}** upserted successfully (type: ${geofence.type}).`
    };
  })
  .build();

export let listGeofencesTool = SlateTool.create(spec, {
  name: 'List Geofences',
  key: 'list_geofences',
  description: `List geofences in your Radar project. Supports filtering by tag and cursor-based pagination. Results are sorted by creation date descending.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tag: z.string().optional().describe('Filter geofences by tag (group name)'),
      limit: z
        .number()
        .optional()
        .describe('Max number of geofences to return (1-1000, default 100)'),
      createdBefore: z
        .string()
        .optional()
        .describe(
          'ISO 8601 datetime cursor for pagination — return geofences created before this time'
        ),
      createdAfter: z
        .string()
        .optional()
        .describe('ISO 8601 datetime cursor — return geofences created after this time')
    })
  )
  .output(
    z.object({
      geofences: z.array(geofenceSchema).describe('List of geofences')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let result = await client.listGeofences({
      tag: ctx.input.tag,
      limit: ctx.input.limit,
      createdBefore: ctx.input.createdBefore,
      createdAfter: ctx.input.createdAfter
    });

    let geofences = (result.geofences || []).map((g: any) => ({
      geofenceId: g._id,
      tag: g.tag,
      externalId: g.externalId,
      description: g.description,
      type: g.type,
      enabled: g.enabled,
      metadata: g.metadata,
      geometryCenter: g.geometryCenter,
      geometryRadius: g.geometryRadius,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt
    }));

    return {
      output: { geofences },
      message: `Found **${geofences.length}** geofence(s).`
    };
  })
  .build();

export let getGeofenceTool = SlateTool.create(spec, {
  name: 'Get Geofence',
  key: 'get_geofence',
  description: `Retrieve a specific geofence by its Radar ID, or by its tag and external ID combination. Also supports listing users currently inside the geofence.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      geofenceId: z
        .string()
        .optional()
        .describe('Radar internal geofence ID. Use this OR tag+externalId.'),
      tag: z
        .string()
        .optional()
        .describe('Geofence tag. Must be used together with externalId.'),
      externalId: z
        .string()
        .optional()
        .describe('Geofence external ID. Must be used together with tag.'),
      includeUsers: z
        .boolean()
        .optional()
        .describe('If true, also return users currently inside this geofence')
    })
  )
  .output(
    z.object({
      geofence: geofenceSchema,
      users: z
        .array(z.any())
        .optional()
        .describe('Users currently inside the geofence (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });

    let geofenceResult: any;
    let identifier: string;

    if (ctx.input.geofenceId) {
      geofenceResult = await client.getGeofence(ctx.input.geofenceId);
      identifier = ctx.input.geofenceId;
    } else if (ctx.input.tag && ctx.input.externalId) {
      geofenceResult = await client.getGeofenceByTagAndExternalId(
        ctx.input.tag,
        ctx.input.externalId
      );
      identifier = `${ctx.input.tag}/${ctx.input.externalId}`;
    } else {
      throw new Error('Provide either geofenceId, or both tag and externalId.');
    }

    let g = geofenceResult.geofence;
    let geofence = {
      geofenceId: g._id,
      tag: g.tag,
      externalId: g.externalId,
      description: g.description,
      type: g.type,
      enabled: g.enabled,
      metadata: g.metadata,
      geometryCenter: g.geometryCenter,
      geometryRadius: g.geometryRadius,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt
    };

    let users: any[] | undefined;
    if (ctx.input.includeUsers) {
      let usersResult = ctx.input.geofenceId
        ? await client.listGeofenceUsers(ctx.input.geofenceId)
        : await client.listGeofenceUsers(`${ctx.input.tag}/${ctx.input.externalId}`);
      users = usersResult.users || [];
    }

    return {
      output: { geofence, users },
      message: `Retrieved geofence **${identifier}**${users ? ` with ${users.length} user(s) inside` : ''}.`
    };
  })
  .build();

export let deleteGeofenceTool = SlateTool.create(spec, {
  name: 'Delete Geofence',
  key: 'delete_geofence',
  description: `Delete a geofence from Radar by its ID, or by its tag and external ID combination.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      geofenceId: z
        .string()
        .optional()
        .describe('Radar internal geofence ID. Use this OR tag+externalId.'),
      tag: z
        .string()
        .optional()
        .describe('Geofence tag. Must be used together with externalId.'),
      externalId: z
        .string()
        .optional()
        .describe('Geofence external ID. Must be used together with tag.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });

    if (ctx.input.geofenceId) {
      await client.deleteGeofence(ctx.input.geofenceId);
    } else if (ctx.input.tag && ctx.input.externalId) {
      await client.deleteGeofenceByTagAndExternalId(ctx.input.tag, ctx.input.externalId);
    } else {
      throw new Error('Provide either geofenceId, or both tag and externalId.');
    }

    return {
      output: { success: true },
      message: `Geofence deleted successfully.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { RadarClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().optional().describe('User ID'),
  radarId: z.string().describe('Radar internal user ID'),
  deviceId: z.string().optional().describe('Device ID'),
  description: z.string().optional().describe('User description'),
  metadata: z.record(z.string(), z.any()).optional().describe('Custom user metadata'),
  location: z.any().optional().describe('Last known location as GeoJSON Point'),
  locationAccuracy: z.number().optional().describe('Location accuracy in meters'),
  foreground: z.boolean().optional().describe('Whether the app was in the foreground'),
  stopped: z.boolean().optional().describe('Whether the user was stopped'),
  deviceType: z.string().optional().describe('Device type: iOS, Android, or Web'),
  createdAt: z.string().optional().describe('When the user was created'),
  updatedAt: z.string().optional().describe('When the user was last updated'),
  geofences: z.array(z.any()).optional().describe('Geofences the user is currently in'),
  place: z.any().optional().describe('Place the user is currently at'),
  country: z.any().optional().describe('Country the user is currently in'),
  state: z.any().optional().describe('State the user is currently in'),
  dma: z.any().optional().describe('DMA the user is currently in'),
  postalCode: z.any().optional().describe('Postal code of the user'),
  fraud: z.any().optional().describe('Fraud detection flags')
});

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List tracked users in your Radar project. Results are sorted by last update time descending. Supports cursor-based pagination.`,
  constraints: ['Rate limited to 10 requests per second.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Max number of users to return (1-1000, default 100)'),
      updatedBefore: z.string().optional().describe('ISO 8601 datetime cursor for pagination'),
      updatedAfter: z.string().optional().describe('ISO 8601 datetime cursor')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let result = await client.listUsers({
      limit: ctx.input.limit,
      updatedBefore: ctx.input.updatedBefore,
      updatedAfter: ctx.input.updatedAfter
    });

    let users = (result.users || []).map((u: any) => ({
      userId: u.userId,
      radarId: u._id,
      deviceId: u.deviceId,
      description: u.description,
      metadata: u.metadata,
      location: u.location,
      locationAccuracy: u.locationAccuracy,
      foreground: u.foreground,
      stopped: u.stopped,
      deviceType: u.deviceType,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      geofences: u.geofences,
      place: u.place,
      country: u.country,
      state: u.state,
      dma: u.dma,
      postalCode: u.postalCode,
      fraud: u.fraud
    }));

    return {
      output: { users },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();

export let getUserTool = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a specific user by Radar ID, user ID, or device ID. Returns the user's full profile including current location, geofences, place, region, and fraud flags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('Radar ID, user ID, or device ID of the user to retrieve')
    })
  )
  .output(userSchema)
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let result = await client.getUser(ctx.input.userId);
    let u = result.user;

    return {
      output: {
        userId: u.userId,
        radarId: u._id,
        deviceId: u.deviceId,
        description: u.description,
        metadata: u.metadata,
        location: u.location,
        locationAccuracy: u.locationAccuracy,
        foreground: u.foreground,
        stopped: u.stopped,
        deviceType: u.deviceType,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        geofences: u.geofences,
        place: u.place,
        country: u.country,
        state: u.state,
        dma: u.dma,
        postalCode: u.postalCode,
        fraud: u.fraud
      },
      message: `Retrieved user **${u.userId || u._id}**.`
    };
  })
  .build();

export let deleteUserTool = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Delete a user from Radar by their Radar ID, user ID, or device ID. This permanently removes the user and their location history.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('Radar ID, user ID, or device ID of the user to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    await client.deleteUser(ctx.input.userId);

    return {
      output: { success: true },
      message: `User **${ctx.input.userId}** deleted successfully.`
    };
  })
  .build();

export let searchNearbyUsersTool = SlateTool.create(spec, {
  name: 'Search Nearby Users',
  key: 'search_nearby_users',
  description: `Search for users near a specific location, sorted by distance. Useful for finding users in proximity to a given point.`,
  constraints: ['Rate limited to 100 requests per second.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude of the search center'),
      longitude: z.number().describe('Longitude of the search center'),
      radius: z.number().optional().describe('Search radius in meters'),
      limit: z.number().optional().describe('Max results to return')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('Users found near the location, sorted by distance')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let result = await client.searchUsers({
      near: `${ctx.input.latitude},${ctx.input.longitude}`,
      radius: ctx.input.radius,
      limit: ctx.input.limit
    });

    let users = (result.users || []).map((u: any) => ({
      userId: u.userId,
      radarId: u._id,
      deviceId: u.deviceId,
      description: u.description,
      metadata: u.metadata,
      location: u.location,
      locationAccuracy: u.locationAccuracy,
      foreground: u.foreground,
      stopped: u.stopped,
      deviceType: u.deviceType,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      geofences: u.geofences,
      place: u.place,
      country: u.country,
      state: u.state,
      dma: u.dma,
      postalCode: u.postalCode,
      fraud: u.fraud
    }));

    return {
      output: { users },
      message: `Found **${users.length}** user(s) near (${ctx.input.latitude}, ${ctx.input.longitude}).`
    };
  })
  .build();

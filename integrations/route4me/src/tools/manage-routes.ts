import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRoutes = SlateTool.create(spec, {
  name: 'Get Routes',
  key: 'get_routes',
  description: `Retrieve a single route by ID or list all routes. Returns route details including stops, directions, and tracking info.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      routeId: z
        .string()
        .optional()
        .describe('Specific route ID to retrieve. Omit to list all routes.'),
      limit: z.number().optional().describe('Max number of routes to return when listing'),
      offset: z.number().optional().describe('Pagination offset when listing'),
      includeDirections: z.boolean().optional().describe('Include turn-by-turn directions'),
      includeTrackingHistory: z.boolean().optional().describe('Include GPS tracking history')
    })
  )
  .output(
    z.object({
      routes: z
        .array(
          z.object({
            routeId: z.string().describe('Route ID'),
            routeName: z.string().optional().describe('Route name'),
            optimizationProblemId: z
              .string()
              .optional()
              .describe('Linked optimization problem ID'),
            tripDistance: z.number().optional().describe('Total trip distance'),
            routeDurationSec: z.number().optional().describe('Route duration in seconds'),
            vehicleAlias: z.string().optional().describe('Assigned vehicle name'),
            driverAlias: z.string().optional().describe('Assigned driver name'),
            memberId: z.number().optional().describe('Assigned member ID'),
            addresses: z.array(z.any()).optional().describe('Stops on the route'),
            directions: z.array(z.any()).optional().describe('Turn-by-turn directions'),
            trackingHistory: z.array(z.any()).optional().describe('GPS tracking history')
          })
        )
        .describe('Route list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.routeId) {
      let options: Record<string, any> = {};
      if (ctx.input.includeDirections) options.directions = 1;
      if (ctx.input.includeTrackingHistory) options.device_tracking_history = 1;
      let r = await client.getRoute(ctx.input.routeId, options);
      return {
        output: {
          routes: [
            {
              routeId: r.route_id,
              routeName: r.route_name,
              optimizationProblemId: r.optimization_problem_id,
              tripDistance: r.trip_distance,
              routeDurationSec: r.route_duration_sec,
              vehicleAlias: r.vehicle_alias,
              driverAlias: r.driver_alias,
              memberId: r.member_id,
              addresses: r.addresses,
              directions: r.directions,
              trackingHistory: r.tracking_history
            }
          ]
        },
        message: `Retrieved route **${r.route_id}** "${r.route_name || ''}" with ${r.addresses?.length || 0} stops.`
      };
    }

    let result = await client.getRoutes({ limit: ctx.input.limit, offset: ctx.input.offset });
    let items = Array.isArray(result) ? result : [];

    return {
      output: {
        routes: items.map((r: any) => ({
          routeId: r.route_id,
          routeName: r.route_name,
          optimizationProblemId: r.optimization_problem_id,
          tripDistance: r.trip_distance,
          routeDurationSec: r.route_duration_sec,
          vehicleAlias: r.vehicle_alias,
          driverAlias: r.driver_alias,
          memberId: r.member_id
        }))
      },
      message: `Retrieved ${items.length} route(s).`
    };
  })
  .build();

export let updateRoute = SlateTool.create(spec, {
  name: 'Update Route',
  key: 'update_route',
  description: `Update a route's properties, resequence stops, add addresses, or remove an address. Combines multiple route editing operations into one tool.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      routeId: z.string().describe('Route ID to update'),
      routeName: z.string().optional().describe('New name for the route'),
      memberId: z.number().optional().describe('Member ID to assign to this route'),
      vehicleId: z.string().optional().describe('Vehicle ID to assign to this route'),
      resequence: z
        .array(
          z.object({
            routeDestinationId: z.number().describe('Destination ID to resequence'),
            sequenceNo: z.number().describe('New sequence number')
          })
        )
        .optional()
        .describe('Resequence stops within the route'),
      addAddresses: z
        .array(
          z.object({
            address: z.string().describe('Street address'),
            lat: z.number().describe('Latitude'),
            lng: z.number().describe('Longitude'),
            time: z.number().optional().describe('Service time in seconds'),
            sequenceNo: z.number().optional().describe('Sequence position')
          })
        )
        .optional()
        .describe('Addresses to add to the route'),
      removeDestinationId: z
        .number()
        .optional()
        .describe('Route destination ID to remove from the route')
    })
  )
  .output(
    z.object({
      routeId: z.string().describe('Updated route ID'),
      success: z.boolean().describe('Whether the operation succeeded'),
      routeName: z.string().optional().describe('Route name'),
      addressCount: z.number().optional().describe('Number of stops on the route')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { routeId } = ctx.input;

    if (ctx.input.removeDestinationId) {
      await client.removeRouteAddress(routeId, ctx.input.removeDestinationId);
      return {
        output: { routeId, success: true },
        message: `Removed destination **${ctx.input.removeDestinationId}** from route **${routeId}**.`
      };
    }

    if (ctx.input.resequence) {
      let addresses = ctx.input.resequence.map(a => ({
        route_destination_id: a.routeDestinationId,
        sequence_no: a.sequenceNo
      }));
      await client.resequenceRoute(routeId, addresses);
      return {
        output: { routeId, success: true },
        message: `Resequenced ${addresses.length} stops on route **${routeId}**.`
      };
    }

    if (ctx.input.addAddresses) {
      let addresses = ctx.input.addAddresses.map(a => ({
        address: a.address,
        lat: a.lat,
        lng: a.lng,
        time: a.time || 0,
        sequence_no: a.sequenceNo
      }));
      await client.addRouteAddresses(routeId, addresses);
      return {
        output: { routeId, success: true },
        message: `Added ${addresses.length} address(es) to route **${routeId}**.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.routeName) body.route_name = ctx.input.routeName;
    if (ctx.input.memberId) body.member_id = ctx.input.memberId;
    if (ctx.input.vehicleId) body.vehicle_id = ctx.input.vehicleId;

    let result = await client.updateRoute(routeId, body);

    return {
      output: {
        routeId: result.route_id || routeId,
        success: true,
        routeName: result.route_name,
        addressCount: result.addresses?.length
      },
      message: `Updated route **${routeId}**.`
    };
  })
  .build();

export let deleteRoute = SlateTool.create(spec, {
  name: 'Delete Route',
  key: 'delete_route',
  description: `Delete a route by ID. This action is permanent and cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      routeId: z.string().describe('Route ID to delete')
    })
  )
  .output(
    z.object({
      routeId: z.string().describe('Deleted route ID'),
      deleted: z.boolean().describe('Whether the route was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteRoute(ctx.input.routeId);
    return {
      output: { routeId: ctx.input.routeId, deleted: true },
      message: `Deleted route **${ctx.input.routeId}**.`
    };
  })
  .build();

export let duplicateRoute = SlateTool.create(spec, {
  name: 'Duplicate Route',
  key: 'duplicate_route',
  description: `Create a copy of an existing route. The duplicated route will have a new route ID but contain the same stops and settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      routeId: z.string().describe('Route ID to duplicate')
    })
  )
  .output(
    z.object({
      routeId: z.string().describe('ID of the newly created duplicate route'),
      optimizationProblemId: z
        .string()
        .optional()
        .describe('Optimization problem ID of the duplicate'),
      success: z.boolean().describe('Whether duplication succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.duplicateRoute(ctx.input.routeId);
    return {
      output: {
        routeId: result.route_id || result.route_ids?.[0] || '',
        optimizationProblemId: result.optimization_problem_id,
        success: true
      },
      message: `Duplicated route **${ctx.input.routeId}**.`
    };
  })
  .build();

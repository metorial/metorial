import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z.object({
  address: z.string().describe('Street address'),
  lat: z.number().describe('Latitude'),
  lng: z.number().describe('Longitude'),
  time: z.number().optional().describe('Service time at this stop in seconds'),
  timeWindowStart: z.number().optional().describe('Start of time window (unix timestamp)'),
  timeWindowEnd: z.number().optional().describe('End of time window (unix timestamp)'),
  weight: z.number().optional().describe('Weight of cargo to deliver/pick up'),
  cube: z.number().optional().describe('Cubic volume of cargo'),
  pieces: z.number().optional().describe('Number of pieces to deliver/pick up'),
  isDepot: z.boolean().optional().describe('Whether this address is a depot'),
  customFields: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom key-value metadata for this address')
});

export let createOptimization = SlateTool.create(spec, {
  name: 'Create Optimization',
  key: 'create_optimization',
  description: `Create and solve a route optimization problem. Provide a set of addresses/destinations with constraints and Route4Me will calculate optimal routes.
Supports multiple algorithm types including TSP, CVRP with time windows, and multi-depot scenarios. Returns the optimized routes with sequenced stops.`,
  instructions: [
    'Provide at least one depot and one non-depot address.',
    'Use algorithm_type values: 1=TSP, 2=VRP, 3=CVRP_TW_SD, 4=CVRP_TW_MD, 5=TSP_TW, 6=TSP_TW_CR, 7=BBCVRP.',
    'Use travel_mode: "Driving", "Walking", "Bicycling", or "Transit".',
    'Use distance_unit: "mi" for miles, "km" for kilometers.',
    'Use optimize: "Distance", "Time", "timeWithTraffic".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      addresses: z
        .array(addressSchema)
        .describe('List of addresses to include in the optimization'),
      parameters: z
        .object({
          algorithmType: z
            .number()
            .optional()
            .describe(
              'Algorithm type (1=TSP, 2=VRP, 3=CVRP_TW_SD, 4=CVRP_TW_MD, 5=TSP_TW, 6=TSP_TW_CR, 7=BBCVRP)'
            ),
          routeName: z.string().optional().describe('Name for the generated route(s)'),
          routeMaxDuration: z
            .number()
            .optional()
            .describe('Maximum duration of each route in seconds'),
          vehicleCapacity: z
            .number()
            .optional()
            .describe('Maximum cargo capacity per vehicle'),
          vehicleMaxDistanceMi: z
            .number()
            .optional()
            .describe('Maximum distance per vehicle in miles'),
          travelMode: z
            .string()
            .optional()
            .describe('Travel mode: Driving, Walking, Bicycling, or Transit'),
          distanceUnit: z.string().optional().describe('Distance unit: mi or km'),
          optimize: z
            .string()
            .optional()
            .describe('Optimization target: Distance, Time, or timeWithTraffic'),
          routeTime: z
            .number()
            .optional()
            .describe('Route start time in seconds from midnight'),
          parts: z.number().optional().describe('Number of route parts (for multi-driver)'),
          storeRoute: z
            .boolean()
            .optional()
            .describe('Whether to store the generated route(s)')
        })
        .optional()
        .describe('Optimization parameters'),
      callbackUrl: z
        .string()
        .optional()
        .describe('URL to receive callback when optimization completes')
    })
  )
  .output(
    z.object({
      optimizationProblemId: z.string().describe('Unique ID of the optimization problem'),
      state: z
        .number()
        .describe(
          'State of the optimization (1=Initial, 2=MatrixGenerating, 3=Optimizing, 4=Optimized, 5=Error, 6=ComputingDirections)'
        ),
      routes: z
        .array(z.any())
        .optional()
        .describe('Generated routes if optimization is complete'),
      addresses: z
        .array(z.any())
        .optional()
        .describe('Addresses included in the optimization'),
      totalDistance: z.number().optional().describe('Total distance across all routes'),
      totalTime: z.number().optional().describe('Total travel time across all routes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      addresses: ctx.input.addresses.map(a => ({
        address: a.address,
        lat: a.lat,
        lng: a.lng,
        time: a.time || 0,
        time_window_start: a.timeWindowStart,
        time_window_end: a.timeWindowEnd,
        weight: a.weight,
        cube: a.cube,
        pieces: a.pieces,
        is_depot: a.isDepot || false,
        custom_fields: a.customFields
      }))
    };

    if (ctx.input.parameters) {
      let p = ctx.input.parameters;
      body.parameters = {
        algorithm_type: p.algorithmType,
        route_name: p.routeName,
        route_max_duration: p.routeMaxDuration,
        vehicle_capacity: p.vehicleCapacity,
        vehicle_max_distance_mi: p.vehicleMaxDistanceMi,
        travel_mode: p.travelMode,
        distance_unit: p.distanceUnit,
        optimize: p.optimize,
        route_time: p.routeTime,
        parts: p.parts,
        store_route: p.storeRoute
      };
    }

    if (ctx.input.callbackUrl) {
      body.parameters = body.parameters || {};
      body.parameters.optimized_callback_url = ctx.input.callbackUrl;
    }

    let result = await client.createOptimization(body);

    let routes = result.routes || [];
    let totalDistance = 0;
    let totalTime = 0;
    for (let route of routes) {
      totalDistance += route.trip_distance || 0;
      totalTime += route.route_duration_sec || 0;
    }

    return {
      output: {
        optimizationProblemId: result.optimization_problem_id,
        state: result.state,
        routes: result.routes,
        addresses: result.addresses,
        totalDistance,
        totalTime
      },
      message: `Created optimization **${result.optimization_problem_id}** with state ${result.state}. ${routes.length} route(s) generated.`
    };
  })
  .build();

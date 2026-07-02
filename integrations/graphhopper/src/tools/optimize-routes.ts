import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphHopperClient } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z.object({
  locationId: z.string().describe('Unique identifier for this location'),
  longitude: z.number().describe('Longitude of the location'),
  latitude: z.number().describe('Latitude of the location'),
  name: z.string().optional().describe('Human-readable name for the location'),
  streetHint: z.string().optional().describe('Street name hint for better snapping')
});

let vehicleSchema = z.object({
  vehicleId: z.string().describe('Unique vehicle identifier'),
  typeId: z.string().optional().describe('Reference to a vehicle type'),
  startAddress: addressSchema.describe('Vehicle start location'),
  endAddress: addressSchema
    .optional()
    .describe('Vehicle end location (defaults to start if returnToDepot is true)'),
  returnToDepot: z.boolean().optional().describe('Whether the vehicle must return to depot'),
  earliestStart: z.number().optional().describe('Earliest start time in seconds'),
  latestEnd: z.number().optional().describe('Latest end time in seconds'),
  skills: z.array(z.string()).optional().describe('Skills this vehicle/driver has'),
  maxDistance: z.number().optional().describe('Maximum travel distance in meters'),
  maxDrivingTime: z.number().optional().describe('Maximum driving time in seconds'),
  maxJobs: z.number().optional().describe('Maximum number of jobs'),
  maxActivities: z.number().optional().describe('Maximum number of activities')
});

let vehicleTypeSchema = z.object({
  typeId: z.string().describe('Unique type identifier'),
  profile: z
    .string()
    .optional()
    .describe('Vehicle routing profile (car, truck, bike, foot, etc.)'),
  capacity: z
    .array(z.number())
    .optional()
    .describe('Capacity dimensions (e.g., [weight, volume])'),
  speedFactor: z.number().optional().describe('Speed multiplier relative to profile default'),
  costPerMeter: z.number().optional().describe('Cost per meter traveled'),
  costPerSecond: z.number().optional().describe('Cost per second traveled'),
  costPerActivation: z.number().optional().describe('Fixed cost per vehicle used')
});

let timeWindowSchema = z.object({
  earliest: z.number().describe('Earliest time in seconds'),
  latest: z.number().describe('Latest time in seconds')
});

let serviceSchema = z.object({
  serviceId: z.string().describe('Unique service/job identifier'),
  name: z.string().optional().describe('Human-readable service name'),
  address: addressSchema.describe('Service location'),
  duration: z.number().optional().describe('Service duration in seconds'),
  timeWindows: z
    .array(timeWindowSchema)
    .optional()
    .describe('Allowed time windows for this service'),
  size: z
    .array(z.number())
    .optional()
    .describe('Size/demand dimensions matching vehicle capacity'),
  priority: z.number().optional().describe('Priority (1=high, 10=low)'),
  type: z.enum(['service', 'pickup', 'delivery']).optional().describe('Service type'),
  requiredSkills: z.array(z.string()).optional().describe('Required driver/vehicle skills'),
  allowedVehicles: z
    .array(z.string())
    .optional()
    .describe('Vehicle IDs allowed to serve this job'),
  disallowedVehicles: z
    .array(z.string())
    .optional()
    .describe('Vehicle IDs not allowed for this job'),
  preparationTime: z.number().optional().describe('Preparation time in seconds')
});

let shipmentStopSchema = z.object({
  address: addressSchema.describe('Stop location'),
  duration: z.number().optional().describe('Stop duration in seconds'),
  timeWindows: z.array(timeWindowSchema).optional().describe('Allowed time windows')
});

let shipmentSchema = z.object({
  shipmentId: z.string().describe('Unique shipment identifier'),
  name: z.string().optional().describe('Human-readable shipment name'),
  priority: z.number().optional().describe('Priority (1=high, 10=low)'),
  pickup: shipmentStopSchema.describe('Pickup stop details'),
  delivery: shipmentStopSchema.describe('Delivery stop details'),
  size: z.array(z.number()).optional().describe('Size/demand dimensions'),
  requiredSkills: z.array(z.string()).optional().describe('Required driver/vehicle skills'),
  allowedVehicles: z
    .array(z.string())
    .optional()
    .describe('Vehicle IDs allowed for this shipment'),
  maxTimeInVehicle: z.number().optional().describe('Maximum time in vehicle in seconds')
});

let objectiveSchema = z.object({
  type: z.enum(['min']).describe('Objective type (minimize)'),
  value: z
    .enum(['vehicles', 'transport_time', 'completion_time'])
    .describe('Value to optimize')
});

let activitySchema = z.object({
  type: z
    .string()
    .describe('Activity type (start, end, service, pickupShipment, deliverShipment, break)'),
  activityId: z.string().optional().describe('ID of the activity'),
  locationId: z.string().optional().describe('Location identifier'),
  address: z.record(z.string(), z.unknown()).optional().describe('Address details'),
  arrivalTime: z.number().optional().describe('Arrival time in seconds'),
  endTime: z.number().optional().describe('End time in seconds'),
  waitingTime: z.number().optional().describe('Waiting time in seconds'),
  distance: z.number().optional().describe('Cumulative distance in meters'),
  drivingTime: z.number().optional().describe('Cumulative driving time in seconds'),
  loadBefore: z.array(z.number()).optional().describe('Load before this activity'),
  loadAfter: z.array(z.number()).optional().describe('Load after this activity')
});

let routeSchema = z.object({
  vehicleId: z.string().describe('Vehicle assigned to this route'),
  distance: z.number().describe('Total route distance in meters'),
  transportTime: z.number().describe('Total transport time in seconds'),
  completionTime: z.number().describe('Total completion time in seconds'),
  waitingTime: z.number().optional().describe('Total waiting time in seconds'),
  serviceDuration: z.number().optional().describe('Total service duration in seconds'),
  activities: z.array(activitySchema).describe('Ordered list of activities')
});

let unassignedDetailSchema = z.object({
  unassignedId: z.string().describe('ID of the unassigned service/shipment'),
  code: z.number().describe('Reason code'),
  reason: z.string().describe('Human-readable reason')
});

export let optimizeRoutes = SlateTool.create(spec, {
  name: 'Optimize Routes',
  key: 'optimize_routes',
  description: `Solve vehicle routing problems (VRP) including traveling salesman problems. Assigns services and shipments to vehicles while respecting constraints like time windows, capacities, skills, and vehicle limits.
Handles pickup-and-delivery problems, multiple vehicles, multiple depots, and various optimization objectives.`,
  instructions: [
    'All addresses use longitude/latitude coordinates.',
    'Time values are in seconds (Unix-style for start/end times, duration for service times).',
    'Capacity and size arrays must have matching dimensions across vehicles and services.',
    'For large problems, the API may take longer to compute; the tool handles async polling automatically.'
  ],
  constraints: [
    'Complex problems with many vehicles/services may take up to several minutes to solve.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      vehicles: z.array(vehicleSchema).min(1).describe('Vehicles available for routing'),
      vehicleTypes: z.array(vehicleTypeSchema).optional().describe('Vehicle type definitions'),
      services: z
        .array(serviceSchema)
        .optional()
        .describe('Service jobs to be assigned to vehicles'),
      shipments: z.array(shipmentSchema).optional().describe('Pickup-and-delivery shipments'),
      objectives: z
        .array(objectiveSchema)
        .optional()
        .describe('Optimization objectives (default: minimize vehicles, then transport time)'),
      calcRoutePoints: z
        .boolean()
        .optional()
        .describe('Include route geometry in the response')
    })
  )
  .output(
    z.object({
      costs: z.number().optional().describe('Total cost of the solution'),
      totalDistance: z
        .number()
        .optional()
        .describe('Total distance across all routes in meters'),
      totalTransportTime: z.number().optional().describe('Total transport time in seconds'),
      completionTime: z.number().optional().describe('Total completion time in seconds'),
      vehiclesUsed: z.number().optional().describe('Number of vehicles used'),
      routes: z.array(routeSchema).describe('Optimized routes per vehicle'),
      unassigned: z
        .object({
          services: z.array(z.string()).optional().describe('Unassigned service IDs'),
          shipments: z.array(z.string()).optional().describe('Unassigned shipment IDs'),
          details: z
            .array(unassignedDetailSchema)
            .optional()
            .describe('Reasons for unassignment')
        })
        .optional()
        .describe('Unassigned services/shipments with reasons'),
      processingTimeMs: z
        .number()
        .optional()
        .describe('Server processing time in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphHopperClient({ token: ctx.auth.token });

    let mapAddress = (addr: z.infer<typeof addressSchema>) => ({
      location_id: addr.locationId,
      lon: addr.longitude,
      lat: addr.latitude,
      ...(addr.name ? { name: addr.name } : {}),
      ...(addr.streetHint ? { street_hint: addr.streetHint } : {})
    });

    let mapTimeWindows = (tw?: z.infer<typeof timeWindowSchema>[]) =>
      tw?.map(w => ({ earliest: w.earliest, latest: w.latest }));

    let vehicles = ctx.input.vehicles.map(v => ({
      vehicle_id: v.vehicleId,
      ...(v.typeId ? { type_id: v.typeId } : {}),
      start_address: mapAddress(v.startAddress),
      ...(v.endAddress ? { end_address: mapAddress(v.endAddress) } : {}),
      ...(v.returnToDepot !== undefined ? { return_to_depot: v.returnToDepot } : {}),
      ...(v.earliestStart !== undefined ? { earliest_start: v.earliestStart } : {}),
      ...(v.latestEnd !== undefined ? { latest_end: v.latestEnd } : {}),
      ...(v.skills ? { skills: v.skills } : {}),
      ...(v.maxDistance !== undefined ? { max_distance: v.maxDistance } : {}),
      ...(v.maxDrivingTime !== undefined ? { max_driving_time: v.maxDrivingTime } : {}),
      ...(v.maxJobs !== undefined ? { max_jobs: v.maxJobs } : {}),
      ...(v.maxActivities !== undefined ? { max_activities: v.maxActivities } : {})
    }));

    let vehicleTypes = ctx.input.vehicleTypes?.map(vt => ({
      type_id: vt.typeId,
      ...(vt.profile ? { profile: vt.profile } : {}),
      ...(vt.capacity ? { capacity: vt.capacity } : {}),
      ...(vt.speedFactor !== undefined ? { speed_factor: vt.speedFactor } : {}),
      ...(vt.costPerMeter !== undefined ? { cost_per_meter: vt.costPerMeter } : {}),
      ...(vt.costPerSecond !== undefined ? { cost_per_second: vt.costPerSecond } : {}),
      ...(vt.costPerActivation !== undefined
        ? { cost_per_activation: vt.costPerActivation }
        : {})
    }));

    let services = ctx.input.services?.map(s => ({
      id: s.serviceId,
      ...(s.name ? { name: s.name } : {}),
      address: mapAddress(s.address),
      ...(s.duration !== undefined ? { duration: s.duration } : {}),
      ...(s.timeWindows ? { time_windows: mapTimeWindows(s.timeWindows) } : {}),
      ...(s.size ? { size: s.size } : {}),
      ...(s.priority !== undefined ? { priority: s.priority } : {}),
      ...(s.type ? { type: s.type } : {}),
      ...(s.requiredSkills ? { required_skills: s.requiredSkills } : {}),
      ...(s.allowedVehicles ? { allowed_vehicles: s.allowedVehicles } : {}),
      ...(s.disallowedVehicles ? { disallowed_vehicles: s.disallowedVehicles } : {}),
      ...(s.preparationTime !== undefined ? { preparation_time: s.preparationTime } : {})
    }));

    let shipments = ctx.input.shipments?.map(sh => ({
      id: sh.shipmentId,
      ...(sh.name ? { name: sh.name } : {}),
      ...(sh.priority !== undefined ? { priority: sh.priority } : {}),
      pickup: {
        address: mapAddress(sh.pickup.address),
        ...(sh.pickup.duration !== undefined ? { duration: sh.pickup.duration } : {}),
        ...(sh.pickup.timeWindows
          ? { time_windows: mapTimeWindows(sh.pickup.timeWindows) }
          : {})
      },
      delivery: {
        address: mapAddress(sh.delivery.address),
        ...(sh.delivery.duration !== undefined ? { duration: sh.delivery.duration } : {}),
        ...(sh.delivery.timeWindows
          ? { time_windows: mapTimeWindows(sh.delivery.timeWindows) }
          : {})
      },
      ...(sh.size ? { size: sh.size } : {}),
      ...(sh.requiredSkills ? { required_skills: sh.requiredSkills } : {}),
      ...(sh.allowedVehicles ? { allowed_vehicles: sh.allowedVehicles } : {}),
      ...(sh.maxTimeInVehicle !== undefined
        ? { max_time_in_vehicle: sh.maxTimeInVehicle }
        : {})
    }));

    let objectives = ctx.input.objectives?.map(o => ({
      type: o.type,
      value: o.value
    }));

    let configuration = ctx.input.calcRoutePoints
      ? { routing: { calc_points: true } }
      : undefined;

    ctx.progress('Submitting route optimization problem...');

    let result: Record<string, unknown>;
    try {
      result = await client.optimizeRoute({
        vehicles,
        vehicleTypes,
        services,
        shipments,
        objectives,
        configuration
      });
    } catch {
      ctx.info('Using async optimization for larger problem...');
      let asyncResult = await client.optimizeRouteAsync({
        vehicles,
        vehicleTypes,
        services,
        shipments,
        objectives,
        configuration
      });
      let jobId = asyncResult.job_id as string;
      ctx.progress(`Optimization job submitted (${jobId}). Polling for results...`);
      result = await client.pollOptimizationSolution(jobId);
    }

    let solution = result.solution as Record<string, unknown> | undefined;
    if (!solution) {
      return {
        output: {
          routes: [],
          processingTimeMs: result.processing_time as number | undefined
        },
        message: 'Optimization completed but no solution was found.'
      };
    }

    let routes = ((solution.routes || []) as Record<string, unknown>[]).map(r => ({
      vehicleId: r.vehicle_id as string,
      distance: r.distance as number,
      transportTime: r.transport_time as number,
      completionTime: r.completion_time as number,
      waitingTime: r.waiting_time as number | undefined,
      serviceDuration: r.service_duration as number | undefined,
      activities: ((r.activities || []) as Record<string, unknown>[]).map(a => ({
        type: a.type as string,
        activityId: a.id as string | undefined,
        locationId: a.location_id as string | undefined,
        address: a.address as Record<string, unknown> | undefined,
        arrivalTime: a.arr_time as number | undefined,
        endTime: a.end_time as number | undefined,
        waitingTime: a.waiting_time as number | undefined,
        distance: a.distance as number | undefined,
        drivingTime: a.driving_time as number | undefined,
        loadBefore: a.load_before as number[] | undefined,
        loadAfter: a.load_after as number[] | undefined
      }))
    }));

    let unassigned = solution.unassigned as Record<string, unknown> | undefined;
    let unassignedOutput = unassigned
      ? {
          services: unassigned.services as string[] | undefined,
          shipments: unassigned.shipments as string[] | undefined,
          details: ((unassigned.details || []) as Record<string, unknown>[]).map(d => ({
            unassignedId: d.id as string,
            code: d.code as number,
            reason: d.reason as string
          }))
        }
      : undefined;

    let vehiclesUsed = solution.no_vehicles as number | undefined;
    let unassignedCount = (solution.no_unassigned as number) || 0;

    return {
      output: {
        costs: solution.costs as number | undefined,
        totalDistance: solution.distance as number | undefined,
        totalTransportTime: solution.transport_time as number | undefined,
        completionTime: solution.completion_time as number | undefined,
        vehiclesUsed,
        routes,
        unassigned: unassignedOutput,
        processingTimeMs: result.processing_time as number | undefined
      },
      message: `Route optimization complete. **${vehiclesUsed ?? routes.length}** vehicle(s) used across **${routes.length}** route(s).${unassignedCount > 0 ? ` **${unassignedCount}** job(s) could not be assigned.` : ''}`
    };
  })
  .build();

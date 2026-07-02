import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getVehicles = SlateTool.create(spec, {
  name: 'Get Vehicles',
  key: 'get_vehicles',
  description: `List all vehicles in your fleet, or retrieve a specific vehicle by ID. Returns vehicle properties, capacity, and constraints.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      vehicleId: z
        .string()
        .optional()
        .describe('Specific vehicle ID to retrieve. Omit to list all.')
    })
  )
  .output(
    z.object({
      vehicles: z
        .array(
          z.object({
            vehicleId: z.string().describe('Vehicle ID'),
            vehicleAlias: z.string().optional().describe('Vehicle name/alias'),
            vehicleMake: z.string().optional().describe('Vehicle make'),
            vehicleModel: z.string().optional().describe('Vehicle model'),
            vehicleYear: z.number().optional().describe('Vehicle year'),
            vehicleLicensePlate: z.string().optional().describe('License plate'),
            vehicleType: z.string().optional().describe('Vehicle type'),
            maxCapacity: z.number().optional().describe('Max cargo capacity'),
            maxDistanceMi: z.number().optional().describe('Max distance in miles')
          })
        )
        .describe('List of vehicles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.vehicleId) {
      let v = await client.getVehicle(ctx.input.vehicleId);
      return {
        output: {
          vehicles: [
            {
              vehicleId: v.vehicle_id,
              vehicleAlias: v.vehicle_alias,
              vehicleMake: v.vehicle_make,
              vehicleModel: v.vehicle_model,
              vehicleYear: v.vehicle_year,
              vehicleLicensePlate: v.vehicle_license_plate,
              vehicleType: v.vehicle_type_id,
              maxCapacity: v.vehicle_capacity,
              maxDistanceMi: v.vehicle_max_distance_mi
            }
          ]
        },
        message: `Retrieved vehicle **${v.vehicle_id}** "${v.vehicle_alias || ''}".`
      };
    }

    let result = await client.getVehicles();
    let items = Array.isArray(result) ? result : result.vehicles || [];

    return {
      output: {
        vehicles: items.map((v: any) => ({
          vehicleId: v.vehicle_id,
          vehicleAlias: v.vehicle_alias,
          vehicleMake: v.vehicle_make,
          vehicleModel: v.vehicle_model,
          vehicleYear: v.vehicle_year,
          vehicleLicensePlate: v.vehicle_license_plate,
          vehicleType: v.vehicle_type_id,
          maxCapacity: v.vehicle_capacity,
          maxDistanceMi: v.vehicle_max_distance_mi
        }))
      },
      message: `Retrieved ${items.length} vehicle(s).`
    };
  })
  .build();

export let createVehicle = SlateTool.create(spec, {
  name: 'Create Vehicle',
  key: 'create_vehicle',
  description: `Add a new vehicle to your fleet with its properties and constraints.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      vehicleAlias: z.string().describe('Vehicle name/alias'),
      vehicleMake: z.string().optional().describe('Vehicle make (e.g., Ford)'),
      vehicleModel: z.string().optional().describe('Vehicle model (e.g., Transit)'),
      vehicleYear: z.number().optional().describe('Vehicle year'),
      vehicleLicensePlate: z.string().optional().describe('License plate number'),
      vehicleType: z.string().optional().describe('Vehicle type'),
      maxCapacity: z.number().optional().describe('Maximum cargo capacity'),
      maxDistanceMi: z.number().optional().describe('Maximum distance in miles'),
      fuelType: z.string().optional().describe('Fuel type: unleaded, diesel, electric, hybrid')
    })
  )
  .output(
    z.object({
      vehicleId: z.string().describe('Created vehicle ID'),
      vehicleAlias: z.string().optional().describe('Vehicle alias')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let body: Record<string, any> = {
      vehicle_alias: ctx.input.vehicleAlias,
      vehicle_make: ctx.input.vehicleMake,
      vehicle_model: ctx.input.vehicleModel,
      vehicle_year: ctx.input.vehicleYear,
      vehicle_license_plate: ctx.input.vehicleLicensePlate,
      vehicle_type_id: ctx.input.vehicleType,
      vehicle_capacity: ctx.input.maxCapacity,
      vehicle_max_distance_mi: ctx.input.maxDistanceMi,
      fuel_type: ctx.input.fuelType
    };

    let result = await client.createVehicle(body);

    return {
      output: {
        vehicleId: result.vehicle_id,
        vehicleAlias: result.vehicle_alias
      },
      message: `Created vehicle **${result.vehicle_id}** "${ctx.input.vehicleAlias}".`
    };
  })
  .build();

export let updateVehicle = SlateTool.create(spec, {
  name: 'Update Vehicle',
  key: 'update_vehicle',
  description: `Update an existing vehicle's properties and constraints.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      vehicleId: z.string().describe('Vehicle ID to update'),
      vehicleAlias: z.string().optional().describe('New vehicle name/alias'),
      vehicleMake: z.string().optional().describe('Vehicle make'),
      vehicleModel: z.string().optional().describe('Vehicle model'),
      vehicleYear: z.number().optional().describe('Vehicle year'),
      vehicleLicensePlate: z.string().optional().describe('License plate'),
      maxCapacity: z.number().optional().describe('Max cargo capacity'),
      maxDistanceMi: z.number().optional().describe('Max distance in miles')
    })
  )
  .output(
    z.object({
      vehicleId: z.string().describe('Updated vehicle ID'),
      success: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let body: Record<string, any> = {};
    if (ctx.input.vehicleAlias) body.vehicle_alias = ctx.input.vehicleAlias;
    if (ctx.input.vehicleMake) body.vehicle_make = ctx.input.vehicleMake;
    if (ctx.input.vehicleModel) body.vehicle_model = ctx.input.vehicleModel;
    if (ctx.input.vehicleYear) body.vehicle_year = ctx.input.vehicleYear;
    if (ctx.input.vehicleLicensePlate)
      body.vehicle_license_plate = ctx.input.vehicleLicensePlate;
    if (ctx.input.maxCapacity !== undefined) body.vehicle_capacity = ctx.input.maxCapacity;
    if (ctx.input.maxDistanceMi !== undefined)
      body.vehicle_max_distance_mi = ctx.input.maxDistanceMi;

    await client.updateVehicle(ctx.input.vehicleId, body);

    return {
      output: { vehicleId: ctx.input.vehicleId, success: true },
      message: `Updated vehicle **${ctx.input.vehicleId}**.`
    };
  })
  .build();

export let deleteVehicle = SlateTool.create(spec, {
  name: 'Delete Vehicle',
  key: 'delete_vehicle',
  description: `Remove a vehicle from your fleet. This action is permanent.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      vehicleId: z.string().describe('Vehicle ID to delete')
    })
  )
  .output(
    z.object({
      vehicleId: z.string().describe('Deleted vehicle ID'),
      deleted: z.boolean().describe('Whether deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteVehicle(ctx.input.vehicleId);
    return {
      output: { vehicleId: ctx.input.vehicleId, deleted: true },
      message: `Deleted vehicle **${ctx.input.vehicleId}**.`
    };
  })
  .build();

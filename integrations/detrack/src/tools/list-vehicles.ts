import { SlateTool } from 'slates';
import { z } from 'zod';
import { DetrackClient } from '../lib/client';
import { spec } from '../spec';

export let listVehiclesTool = SlateTool.create(spec, {
  name: 'List Vehicles',
  key: 'list_vehicles',
  description: `Retrieves all vehicles (drivers) registered in Detrack. Returns driver names, IDs, GPS location, speed, battery level, connection status, and distance traveled.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      vehicles: z
        .array(
          z.object({
            vehicleId: z.string().optional().describe('Organization-driver pairing ID'),
            detrackId: z.string().optional().describe('Driver-unique Detrack ID'),
            name: z.string().describe('Driver/vehicle name'),
            lat: z.number().optional().describe('Current GPS latitude'),
            lng: z.number().optional().describe('Current GPS longitude'),
            speed: z.number().optional().describe('Current speed'),
            batteryLevel: z.number().optional().describe('Device battery level'),
            distanceTraveled: z.number().optional().describe('Distance traveled'),
            connected: z.boolean().optional().describe('Whether the driver app is connected')
          })
        )
        .describe('List of vehicles/drivers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DetrackClient(ctx.auth.token);

    let result = await client.listVehicles();

    let vehicles = (Array.isArray(result) ? result : []).map(v => ({
      vehicleId: v.id ? String(v.id) : undefined,
      detrackId: v.detrack_id ? String(v.detrack_id) : undefined,
      name: String(v.name ?? ''),
      lat: typeof v.lat === 'number' ? v.lat : undefined,
      lng: typeof v.lng === 'number' ? v.lng : undefined,
      speed: typeof v.speed === 'number' ? v.speed : undefined,
      batteryLevel: typeof v.battery_level === 'number' ? v.battery_level : undefined,
      distanceTraveled:
        typeof v.distance_traveled === 'number' ? v.distance_traveled : undefined,
      connected: typeof v.connected === 'boolean' ? v.connected : undefined
    }));

    return {
      output: { vehicles },
      message: `Found **${vehicles.length}** vehicle(s)/driver(s).`
    };
  })
  .build();

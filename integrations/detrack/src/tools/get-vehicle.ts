import { SlateTool } from 'slates';
import { z } from 'zod';
import { DetrackClient, requireDetrackString } from '../lib/client';
import { spec } from '../spec';

export let getVehicleTool = SlateTool.create(spec, {
  name: 'Get Vehicle',
  key: 'get_vehicle',
  description:
    'Retrieves a driver or vehicle by its exact name, including its identifiers, location, status and operational details. Use list_vehicles to discover names.',
  tags: { readOnly: true }
})
  .input(
    z.object({ name: z.string().describe('Exact vehicle or driver name from list_vehicles') })
  )
  .output(
    z.object({
      name: z.string().describe('Vehicle or driver name'),
      vehicleId: z.string().optional().describe('Organization-driver pairing ID'),
      detrackId: z.string().optional().describe('Driver-unique Detrack ID'),
      raw: z.record(z.string(), z.unknown()).describe('Full vehicle details')
    })
  )
  .handleInvocation(async ctx => {
    let vehicle = await new DetrackClient(ctx.auth.token).getVehicle(ctx.input.name);
    return {
      output: {
        name: requireDetrackString(vehicle, 'name'),
        vehicleId: typeof vehicle.id === 'string' ? vehicle.id : undefined,
        detrackId: typeof vehicle.detrack_id === 'string' ? vehicle.detrack_id : undefined,
        raw: vehicle
      },
      message: `Retrieved vehicle **${ctx.input.name}**.`
    };
  })
  .build();

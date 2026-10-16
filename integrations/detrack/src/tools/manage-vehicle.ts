import { SlateTool } from 'slates';
import { z } from 'zod';
import { DetrackClient } from '../lib/client';
import { spec } from '../spec';

export let manageVehicleTool = SlateTool.create(spec, {
  name: 'Manage Vehicle',
  key: 'manage_vehicle',
  description: `Creates, updates, or deletes a vehicle (driver) in Detrack. Create requires a name and detrackId from the driver app. Update and delete resolve the exact vehicle name to its ID first. Use list_vehicles to discover names.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Operation to perform on the vehicle'),
      name: z.string().describe('Driver/vehicle name — used as the primary identifier'),
      detrackId: z
        .string()
        .optional()
        .describe('Detrack ID from the driver app. Required for create; optional for update.')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Action that was performed'),
      name: z.string().describe('Vehicle/driver name'),
      vehicleId: z.string().optional().describe('Organization-driver pairing ID'),
      detrackId: z.string().optional().describe('Driver-unique Detrack ID'),
      success: z.boolean().describe('Whether the operation was successful'),
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full vehicle response from Detrack')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DetrackClient(ctx.auth.token);
    let result: Record<string, unknown> = {};

    if (ctx.input.action === 'create') {
      result = await client.createVehicle({
        name: ctx.input.name,
        detrack_id: ctx.input.detrackId
      });
    } else if (ctx.input.action === 'update') {
      let updateData = { name: ctx.input.name, detrack_id: ctx.input.detrackId };
      result = await client.updateVehicle(updateData);
    } else if (ctx.input.action === 'delete') {
      result = await client.deleteVehicle(ctx.input.name);
    }

    let actionLabel =
      ctx.input.action === 'create'
        ? 'Created'
        : ctx.input.action === 'update'
          ? 'Updated'
          : 'Deleted';

    return {
      output: {
        action: ctx.input.action,
        name: ctx.input.name,
        vehicleId: result.id ? String(result.id) : undefined,
        detrackId: result.detrack_id ? String(result.detrack_id) : undefined,
        success: true,
        raw: result
      },
      message: `${actionLabel} vehicle/driver **${ctx.input.name}**.`
    };
  })
  .build();

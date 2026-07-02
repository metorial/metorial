import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let singleDriverSchema = z.object({
  externalId: z.string().describe('Driver external identifier'),
  date: z.string().describe('Date to update (YYYY-MM-DD)'),
  enabled: z.boolean().optional().describe('Enable or disable the driver for this date'),
  workTimeFrom: z.string().optional().describe('Shift start time (HH:MM)'),
  workTimeTo: z.string().optional().describe('Shift end time (HH:MM)'),
  assignedVehicle: z.string().optional().describe('Assigned vehicle external ID'),
  vehicleCapacity1: z.number().optional().describe('Vehicle load capacity 1'),
  vehicleCapacity2: z.number().optional().describe('Vehicle load capacity 2'),
  vehicleCapacity3: z.number().optional().describe('Vehicle load capacity 3'),
  vehicleCapacity4: z.number().optional().describe('Vehicle load capacity 4'),
  startLatitude: z.number().optional().describe('Custom start location latitude'),
  startLongitude: z.number().optional().describe('Custom start location longitude'),
  startAddress: z.string().optional().describe('Custom start location address'),
  endLatitude: z.number().optional().describe('Custom end location latitude'),
  endLongitude: z.number().optional().describe('Custom end location longitude'),
  endAddress: z.string().optional().describe('Custom end location address')
});

export let updateDriverParameters = SlateTool.create(spec, {
  name: 'Update Driver Parameters',
  key: 'update_driver_parameters',
  description: `Update driver parameters for a specific date, including enabling/disabling drivers, adjusting working hours, assigning vehicles, setting load capacities, and changing start/end locations. Supports both single and bulk updates.

**Warning:** Updating driver parameters for a date unschedules any existing routes for that driver on that date.`,
  constraints: [
    'Maximum 500 driver updates per bulk request',
    'Updating parameters will unschedule existing routes for the driver on that date'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      drivers: z.array(singleDriverSchema).describe('One or more driver parameter updates')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      results: z
        .array(
          z.object({
            success: z.boolean(),
            driverExternalId: z.string().optional(),
            date: z.string().optional(),
            code: z.string().optional(),
            message: z.string().optional()
          })
        )
        .describe('Per-driver update results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.drivers.length === 1) {
      let d = ctx.input.drivers[0]!;
      let result = await client.updateDriverParameters(d);
      return {
        output: {
          success: result.success,
          results: [
            {
              success: result.success,
              driverExternalId: d.externalId,
              date: d.date,
              code: result.code,
              message: result.message
            }
          ]
        },
        message: result.success
          ? `Driver **${d.externalId}** parameters updated for ${d.date}.`
          : `Failed to update driver: ${result.message || result.code}`
      };
    }

    let updates = ctx.input.drivers.map(d => {
      let update: Record<string, unknown> = {
        driver: { externalId: d.externalId },
        date: d.date
      };
      if (d.enabled !== undefined) update.enabled = d.enabled;
      if (d.workTimeFrom || d.workTimeTo) {
        update.workTime = {
          from: d.workTimeFrom,
          to: d.workTimeTo
        };
      }
      if (d.assignedVehicle) update.assignedVehicle = d.assignedVehicle;
      if (d.vehicleCapacity1 !== undefined) update.vehicleCapacity1 = d.vehicleCapacity1;
      if (d.vehicleCapacity2 !== undefined) update.vehicleCapacity2 = d.vehicleCapacity2;
      if (d.vehicleCapacity3 !== undefined) update.vehicleCapacity3 = d.vehicleCapacity3;
      if (d.vehicleCapacity4 !== undefined) update.vehicleCapacity4 = d.vehicleCapacity4;
      if (d.startLatitude !== undefined && d.startLongitude !== undefined) {
        update.startLocation = {
          type: 'custom',
          latitude: d.startLatitude,
          longitude: d.startLongitude,
          address: d.startAddress
        };
      }
      if (d.endLatitude !== undefined && d.endLongitude !== undefined) {
        update.endLocation = {
          type: 'custom',
          latitude: d.endLatitude,
          longitude: d.endLongitude,
          address: d.endAddress
        };
      }
      return update;
    });

    let result = await client.updateDriversParameters(updates);

    let results = (result.updates || []).map((u: Record<string, unknown>) => ({
      success: u.success as boolean,
      driverExternalId: (u.driver as Record<string, unknown> | undefined)?.externalId as
        | string
        | undefined,
      date: u.date as string | undefined,
      code: u.code as string | undefined,
      message: u.message as string | undefined
    }));

    let successCount = results.filter((r: { success: boolean }) => r.success).length;

    return {
      output: {
        success: result.success,
        results
      },
      message: `Updated **${successCount}** of **${results.length}** driver parameter sets.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateDriverPositions = SlateTool.create(spec, {
  name: 'Update Driver Positions',
  key: 'update_driver_positions',
  description: `Push driver GPS positions into OptimoRoute from an external source. Accepts timestamped latitude/longitude coordinates with optional speed, heading, and accuracy for one or more drivers.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      positions: z
        .array(
          z.object({
            driverExternalId: z.string().optional().describe('Driver external ID'),
            driverSerial: z.string().optional().describe('Driver serial number'),
            latitude: z.number().describe('GPS latitude'),
            longitude: z.number().describe('GPS longitude'),
            timestamp: z.number().describe('Unix timestamp in seconds'),
            speed: z.number().optional().describe('Speed in m/s'),
            heading: z
              .number()
              .optional()
              .describe('Direction (0=north, 90=east, 180=south, 270=west)'),
            accuracy: z.number().optional().describe('GPS accuracy radius in meters')
          })
        )
        .describe('Driver position updates')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      positions: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Per-position results'),
      code: z.string().optional(),
      message: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let positions = ctx.input.positions.map(p => {
      let pos: Record<string, unknown> = {
        latitude: p.latitude,
        longitude: p.longitude,
        timestamp: p.timestamp
      };
      if (p.driverExternalId) pos.driverExternalId = p.driverExternalId;
      if (p.driverSerial) pos.driverSerial = p.driverSerial;
      if (p.speed !== undefined) pos.speed = p.speed;
      if (p.heading !== undefined) pos.heading = p.heading;
      if (p.accuracy !== undefined) pos.accuracy = p.accuracy;
      return pos;
    });

    let result = await client.updateDriversPositions(positions);

    return {
      output: {
        success: result.success,
        positions: result.positions,
        code: result.code,
        message: result.message
      },
      message: result.success
        ? `Updated **${positions.length}** driver position(s).`
        : `Failed to update driver positions: ${result.message || result.code}`
    };
  })
  .build();

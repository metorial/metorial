import { createApiServiceError, SlateTool } from 'slates';
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

    if (ctx.input.positions.length === 0) {
      throw createApiServiceError('Provide at least one driver position.');
    }
    let updates: {
      driver: { externalId?: string; serial?: string };
      positions: Record<string, unknown>[];
    }[] = [];
    for (let position of ctx.input.positions) {
      if (!position.driverExternalId?.trim() && !position.driverSerial?.trim()) {
        throw createApiServiceError(
          'Provide driverExternalId or driverSerial for every position.'
        );
      }
      if (!Number.isSafeInteger(position.timestamp)) {
        throw createApiServiceError(
          'Position timestamp must be a whole number of Unix seconds.'
        );
      }
      if (
        position.latitude < -90 ||
        position.latitude > 90 ||
        position.longitude < -180 ||
        position.longitude > 180
      ) {
        throw createApiServiceError(
          'Provide valid latitude (-90 to 90) and longitude (-180 to 180).'
        );
      }
      let matching = updates.filter(
        update =>
          (position.driverExternalId &&
            update.driver.externalId === position.driverExternalId) ||
          (position.driverSerial && update.driver.serial === position.driverSerial)
      );
      let driver = {
        externalId: position.driverExternalId,
        serial: position.driverSerial
      };
      for (let update of matching) {
        if (
          (driver.externalId &&
            update.driver.externalId &&
            driver.externalId !== update.driver.externalId) ||
          (driver.serial && update.driver.serial && driver.serial !== update.driver.serial)
        ) {
          throw createApiServiceError(
            'Conflicting driver identifiers were supplied for the same driver.'
          );
        }
        driver.externalId ??= update.driver.externalId;
        driver.serial ??= update.driver.serial;
      }
      let positions = matching.flatMap(update => update.positions);
      if (positions.length >= 100) {
        throw createApiServiceError(
          'Provide at most 100 positions for each driver per request.'
        );
      }
      positions.push({
        timestamp: position.timestamp,
        latitude: position.latitude,
        longitude: position.longitude,
        speed: position.speed,
        heading: position.heading,
        accuracy: position.accuracy
      });
      updates = updates.filter(update => !matching.includes(update));
      updates.push({ driver, positions });
    }

    let result = await client.updateDriversPositions(updates);
    let results = Array.isArray(result.updates) ? result.updates : [];
    let successful = results.filter(
      (update: Record<string, unknown>) => update.success === true
    ).length;
    let failed = results.filter(
      (update: Record<string, unknown>) => update.success === false
    ).length;
    let unconfirmed = Math.max(0, updates.length - successful - failed);

    return {
      output: {
        success: result.success,
        positions: result.updates ?? result.positions,
        code: result.code,
        message: result.message
      },
      message: `Confirmed **${successful}** of **${updates.length}** driver updates; **${failed}** failed and **${unconfirmed}** unconfirmed.`
    };
  })
  .build();

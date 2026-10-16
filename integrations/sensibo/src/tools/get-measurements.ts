import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { checked, deviceIdSchema, SensiboClient } from '../lib/client';
import { spec } from '../spec';

let measurementTime = (time: any): string | undefined => {
  if (typeof time === 'string') return time;
  if (typeof time?.time === 'string') return time.time;
  if (time?.secondsAgo === undefined) return undefined;
  let timestamp =
    typeof time.secondsAgo === 'number' ? Date.now() - time.secondsAgo * 1000 : Number.NaN;
  if (!Number.isFinite(timestamp) || Math.abs(timestamp) > 8.64e15)
    throw createApiServiceError('Sensibo returned an invalid measurement time.');
  return new Date(timestamp).toISOString();
};

let measurementSchema = z.object({
  temperature: z.number().optional().describe('Temperature reading'),
  humidity: z.number().optional().describe('Humidity reading'),
  time: z.string().optional().describe('ISO 8601 timestamp of the measurement')
});

let outputSchema = z.object({
  deviceId: z.string().describe('The device measurements belong to'),
  measurements: z.array(measurementSchema).describe('Array of measurement readings')
});

export let getMeasurementsTool = SlateTool.create(spec, {
  name: 'Get Measurements',
  key: 'get_measurements',
  description: `Retrieve environmental sensor measurements from a Sensibo device. Returns temperature and humidity readings, historical for the requested number of days. Availability depends on the device and account.`,
  constraints: [
    'This tool accepts 1–7 days; the provider may restrict the available history.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deviceId: deviceIdSchema,
      days: z
        .number()
        .min(1)
        .max(7)
        .optional()
        .describe('Number of days of historical data to retrieve (1-7, default 1)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new SensiboClient(ctx.auth.token);
    let result = await (async () => {
      let days = ctx.input.days ?? 1;

      let rawMeasurements = await client.getHistoricalMeasurements(ctx.input.deviceId, days);

      let measurements = rawMeasurements.map((m: any) => ({
        temperature: m.temperature,
        humidity: m.humidity,
        time: measurementTime(m.time)
      }));

      return {
        output: {
          deviceId: ctx.input.deviceId,
          measurements
        },
        message: `Retrieved **${measurements.length}** measurement(s) from device **${ctx.input.deviceId}** over the last ${days} day(s).`
      };
    })();
    return {
      ...result,
      output: checked(outputSchema, client.sanitize(result.output), 'tool output'),
      message: client.sanitize(result.message)
    };
  })
  .build();

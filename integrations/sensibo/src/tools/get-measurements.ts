import { SlateTool } from 'slates';
import { z } from 'zod';
import { SensiboClient } from '../lib/client';
import { spec } from '../spec';

let measurementSchema = z.object({
  temperature: z.number().optional().describe('Temperature reading'),
  humidity: z.number().optional().describe('Humidity reading'),
  time: z.string().optional().describe('ISO 8601 timestamp of the measurement')
});

export let getMeasurementsTool = SlateTool.create(spec, {
  name: 'Get Measurements',
  key: 'get_measurements',
  description: `Retrieve environmental sensor measurements from a Sensibo device. Returns temperature and humidity readings, either current or historical up to 7 days in the past. Sensibo Air Pro and Elements devices may also include air quality data.`,
  constraints: ['Historical data is available for up to 7 days in the past.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deviceId: z.string().describe('The unique ID of the Sensibo device'),
      days: z
        .number()
        .min(1)
        .max(7)
        .optional()
        .describe('Number of days of historical data to retrieve (1-7, default 1)')
    })
  )
  .output(
    z.object({
      deviceId: z.string().describe('The device measurements belong to'),
      measurements: z.array(measurementSchema).describe('Array of measurement readings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SensiboClient(ctx.auth.token);
    let days = ctx.input.days ?? 1;

    let rawMeasurements = await client.getHistoricalMeasurements(ctx.input.deviceId, days);

    let measurements = (rawMeasurements || []).map((m: any) => ({
      temperature: m.temperature,
      humidity: m.humidity,
      time:
        m.time?.secondsAgo !== undefined
          ? new Date(Date.now() - m.time.secondsAgo * 1000).toISOString()
          : m.time?.time
    }));

    return {
      output: {
        deviceId: ctx.input.deviceId,
        measurements
      },
      message: `Retrieved **${measurements.length}** measurement(s) from device **${ctx.input.deviceId}** over the last ${days} day(s).`
    };
  })
  .build();

import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSolarPrediction = SlateTool.create(spec, {
  name: 'Solar Generation Forecast',
  key: 'get_solar_prediction',
  description: `Provides solar energy production forecasts for a specific location and panel configuration. Returns hourly energy estimates in watt-hours. Supports customization based on panel technology, tilt angle, azimuth, and installed capacity.`,
  instructions: [
    'Provide a postal code, a complete latitude/longitude pair, or a solar plant ID. Capacity is optional.',
    'For more accurate predictions, also provide latitude, longitude, tilt angle, and azimuth.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      zip: z.string().optional().describe('German postal code (Postleitzahl), 5 digits'),
      lat: z.number().optional().describe('Latitude of the solar installation'),
      lng: z.number().optional().describe('Longitude of the solar installation'),
      kwp: z
        .number()
        .optional()
        .describe('Positive installed panel capacity in kilowatt peak (kWp)'),
      tilt: z
        .number()
        .optional()
        .describe('Panel tilt angle in degrees (0 = horizontal, 90 = vertical)'),
      azimuth: z
        .number()
        .optional()
        .describe('Panel azimuth in degrees (0 = north, 90 = east, 180 = south, 270 = west)'),
      technology: z.string().optional().describe('Solar panel technology, e.g. crystSi'),
      lossPercent: z.number().optional().describe('Estimated system losses in percent, 0-100'),
      plant: z.string().optional().describe('Existing solar plant identifier, when known')
    })
  )
  .output(
    z.object({
      raw: z.unknown().describe('Complete provider response'),
      forecast: z
        .array(
          z.object({
            epochTime: z.number().optional().describe('Unix timestamp in seconds'),
            timeStamp: z.number().optional().describe('Timestamp in milliseconds'),
            wattHours: z
              .number()
              .optional()
              .describe('Expected energy production in watt-hours for the interval'),
            watts: z.number().optional().describe('Expected power output in watts')
          })
        )
        .describe('Hourly solar generation forecast')
    })
  )
  .handleInvocation(async ctx => {
    let zip = ctx.input.zip || ctx.config.zip;
    if (
      !zip &&
      ctx.input.lat === undefined &&
      ctx.input.lng === undefined &&
      !ctx.input.plant
    ) {
      throw createApiServiceError(
        'Provide a postal code, a latitude/longitude pair, or a solar plant ID.'
      );
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.getSolarPrediction({
      zip: zip,
      lat: ctx.input.lat,
      lng: ctx.input.lng,
      kwp: ctx.input.kwp,
      tilt: ctx.input.tilt,
      azimuth: ctx.input.azimuth,
      technology: ctx.input.technology,
      lossPercent: ctx.input.lossPercent,
      plant: ctx.input.plant
    });

    let forecast = (result.output ?? result.forecast ?? []).map(item => ({
      epochTime:
        item.epochtime ?? (item.timestamp === undefined ? undefined : item.timestamp / 1000),
      timeStamp: item.timestamp ?? item.timeStamp,
      wattHours: item.wh,
      watts: item.watt
    }));

    return {
      output: { raw: result, forecast },
      message: `Retrieved solar generation forecast with **${forecast.length}** hourly entries${zip ? ` for postal code **${zip}**` : ''}.`
    };
  })
  .build();

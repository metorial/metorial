import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSolarPrediction = SlateTool.create(spec, {
  name: 'Solar Generation Forecast',
  key: 'get_solar_prediction',
  description: `Provides solar energy production forecasts for a specific location and panel configuration. Returns hourly output estimates in watts and watt-hours. Supports customization based on panel technology, tilt angle, azimuth, and installed capacity.`,
  instructions: [
    'At minimum, provide a postal code and the installed capacity in kWp (kilowatt peak).',
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
      kwp: z.number().optional().describe('Panel capacity in kilowatt peak (0.1-1000 kWp)'),
      tilt: z
        .number()
        .optional()
        .describe('Panel tilt angle in degrees (0 = horizontal, 90 = vertical)'),
      azimuth: z
        .number()
        .optional()
        .describe('Panel azimuth in degrees (0 = north, 90 = east, 180 = south, 270 = west)'),
      technology: z.string().optional().describe('Solar panel technology type')
    })
  )
  .output(
    z.object({
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
    if (!zip && !ctx.input.lat && !ctx.input.lng) {
      throw new Error('Either a postal code (zip) or coordinates (lat/lng) are required.');
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.getSolarPrediction({
      zip: zip,
      lat: ctx.input.lat,
      lng: ctx.input.lng,
      kwp: ctx.input.kwp,
      tilt: ctx.input.tilt,
      azimuth: ctx.input.azimuth,
      technology: ctx.input.technology
    });

    let forecast = (result.forecast || []).map(item => ({
      epochTime: item.epochtime,
      timeStamp: item.timeStamp,
      wattHours: item.wh,
      watts: item.watt
    }));

    return {
      output: { forecast },
      message: `Retrieved solar generation forecast with **${forecast.length}** hourly entries${zip ? ` for postal code **${zip}**` : ''}.`
    };
  })
  .build();

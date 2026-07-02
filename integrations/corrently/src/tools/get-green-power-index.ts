import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGreenPowerIndex = SlateTool.create(spec, {
  name: 'Green Power Index',
  key: 'get_green_power_index',
  description: `Retrieves the GrünstromIndex (Green Power Index) forecast for a German postal code. Returns hourly predictions of renewable energy availability, CO2 emissions per kWh, and dynamic energy pricing. Useful for optimizing energy consumption around periods of high renewable energy availability.`,
  constraints: [
    'Only supports German postal codes (5 digits).',
    'Forecast data is typically available for the next 24-48 hours.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      zip: z.string().describe('German postal code (Postleitzahl), 5 digits, e.g. "69168"')
    })
  )
  .output(
    z.object({
      city: z.string().optional().describe('City name for the postal code'),
      zip: z.string().optional().describe('Postal code'),
      forecast: z
        .array(
          z.object({
            epochTime: z.number().describe('Unix timestamp in seconds'),
            timeStamp: z.number().describe('Timestamp in milliseconds'),
            gsi: z
              .number()
              .describe('GreenPowerIndex value 0-100 (higher = more renewable energy)'),
            co2GreenEnergy: z
              .number()
              .optional()
              .describe('CO2 in grams per kWh for green energy mix'),
            co2Standard: z
              .number()
              .optional()
              .describe('CO2 in grams per kWh for standard energy mix'),
            energyPrice: z
              .number()
              .optional()
              .describe('Local/regional energy price modification'),
            solarIndex: z
              .number()
              .optional()
              .describe('Sub-index for solar energy availability')
          })
        )
        .describe('Hourly forecast entries'),
      signature: z.string().optional().describe('Digital signature for data verification')
    })
  )
  .handleInvocation(async ctx => {
    let zip = ctx.input.zip || ctx.config.zip;
    if (!zip) {
      throw new Error(
        'A German postal code (zip) is required. Provide it as input or configure a default in settings.'
      );
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.getGsiPrediction({ zip });

    let forecast = (result.forecast || []).map(item => ({
      epochTime: item.epochtime,
      timeStamp: item.timeStamp,
      gsi: item.gsi,
      co2GreenEnergy: item.co2_g_oekostrom,
      co2Standard: item.co2_g_standard,
      energyPrice: item.energyprice,
      solarIndex: item.sci
    }));

    return {
      output: {
        city: result.location?.city,
        zip: result.location?.zip,
        forecast,
        signature: result.signature
      },
      message: `Retrieved Green Power Index forecast for **${result.location?.city || zip}** with **${forecast.length}** hourly entries.`
    };
  })
  .build();

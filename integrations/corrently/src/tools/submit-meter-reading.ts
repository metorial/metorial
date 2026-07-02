import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let submitMeterReading = SlateTool.create(spec, {
  name: 'Submit Meter Reading',
  key: 'submit_meter_reading',
  description: `Submits an electricity meter reading and receives a decorated response with CO2 emissions breakdown. The reading is split into green and grey energy components based on the GrünstromIndex. Useful for ESG Scope 2 emissions reporting and real-time CO2 tracking.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      zip: z.string().describe('German postal code (Postleitzahl) of the metered location'),
      energy: z.number().describe('Meter reading in watt-hours (Wh)'),
      account: z
        .string()
        .optional()
        .describe('Stromkonto account address associated with the meter'),
      secret: z.string().optional().describe('Private password for meter reading updates')
    })
  )
  .output(
    z.object({
      totalReading: z.number().optional().describe('Total meter reading in Wh'),
      greenEnergy: z
        .number()
        .optional()
        .describe('Green energy portion per GrünstromIndex in Wh'),
      greyEnergy: z.number().optional().describe('Grey (non-renewable) energy portion in Wh'),
      co2GreenEnergy: z
        .number()
        .optional()
        .describe('CO2 emission in grams for green energy mix'),
      co2Standard: z
        .number()
        .optional()
        .describe('CO2 emission in grams for standard energy mix'),
      account: z.string().optional().describe('Stromkonto account address'),
      timeStamp: z.number().optional().describe('API consensus timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let zip = ctx.input.zip || ctx.config.zip;
    if (!zip) {
      throw new Error('A German postal code (zip) is required.');
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.postMeterReading({
      zip,
      energy: ctx.input.energy,
      account: ctx.input.account,
      secret: ctx.input.secret
    });

    return {
      output: {
        totalReading: result['1.8.0'],
        greenEnergy: result['1.8.1'],
        greyEnergy: result['1.8.2'],
        co2GreenEnergy: result.co2_g_oekostrom,
        co2Standard: result.co2_g_standard,
        account: result.account,
        timeStamp: result.timeStamp
      },
      message: `Submitted meter reading of **${ctx.input.energy} Wh** for **${zip}**. CO2: **${result.co2_g_standard ?? 'N/A'}g** (standard) / **${result.co2_g_oekostrom ?? 'N/A'}g** (green).`
    };
  })
  .build();

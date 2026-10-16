import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { co2MeterOutput } from '../lib/co2-meter';
import { spec } from '../spec';

export let updateCo2Meter = SlateTool.create(spec, {
  name: 'Create or Update CO2 Meter',
  key: 'update_co2_meter',
  description:
    'Creates a CO2 meter for a German postal code or updates an existing meter using its meterId. Submit the cumulative electricity reading in whole watt-hours and retain the returned meterId.',
  tags: { readOnly: false }
})
  .input(
    z.object({
      meterId: z
        .string()
        .optional()
        .describe('Existing ID returned by update_co2_meter; omit to create a new meter'),
      zip: z.string().optional().describe('German postal code, required to create a meter'),
      reading: z
        .number()
        .describe('Cumulative electricity meter reading in whole watt-hours (Wh)')
    })
  )
  .output(co2MeterOutput)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateCo2Meter({
      ...ctx.input,
      zip: ctx.input.zip || (ctx.input.meterId ? undefined : ctx.config.zip)
    });
    return {
      output: {
        meterId: result.meterId,
        reading: result.reading,
        co2: result.co2,
        created: result.created,
        updated: result.updated,
        expires: result.expires,
        raw: result
      },
      message: 'Processed the CO2 meter reading.'
    };
  })
  .build();

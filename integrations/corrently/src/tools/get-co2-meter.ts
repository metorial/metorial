import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { co2MeterOutput } from '../lib/co2-meter';
import { spec } from '../spec';

export let getCo2Meter = SlateTool.create(spec, {
  name: 'Get CO2 Meter',
  key: 'get_co2_meter',
  description:
    'Retrieves a CO2 meter and its latest reading, emissions, forecast, and expiry. Use the meterId returned by update_co2_meter.',
  tags: { readOnly: true }
})
  .input(
    z.object({ meterId: z.string().describe('CO2 meter ID returned by update_co2_meter') })
  )
  .output(co2MeterOutput)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCo2Meter(ctx.input.meterId);
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
      message: 'Retrieved the CO2 meter reading.'
    };
  })
  .build();

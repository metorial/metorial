import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let compareChargeOrFuel = SlateTool.create(spec, {
  name: 'Compare PHEV Charging and Fueling',
  key: 'compare_charge_or_fuel',
  description:
    'Compares electricity and fuel costs and CO2 emissions per 100 km for a plug-in hybrid in Germany. Returns local fuel station details and price-based and emission-based advice.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      zip: z.string().describe('German postal code, 5 digits'),
      electricConsumption: z
        .number()
        .describe('Vehicle electricity consumption in kWh per 100 km'),
      fuelConsumption: z.number().describe('Vehicle fuel consumption in liters per 100 km')
    })
  )
  .output(
    z.object({
      data: z
        .record(z.string(), z.unknown())
        .describe(
          'Complete response including fuel, electricity, advice, savings, and location'
        )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).compareChargeOrFuel(ctx.input);
    return {
      output: { data: result },
      message: 'Compared PHEV charging and fueling costs and emissions.'
    };
  })
  .build();

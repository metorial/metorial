import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCo2Advice = SlateTool.create(spec, {
  name: 'CO2 Consumption Advice',
  key: 'get_co2_advice',
  description:
    'Retrieves hourly CO2 intensity and traffic-light advice for electricity consumption at a German postal code, including threshold definitions and location information.',
  tags: { readOnly: true }
})
  .input(z.object({ zip: z.string().describe('German postal code, 5 digits') }))
  .output(
    z.object({
      data: z
        .record(z.string(), z.unknown())
        .describe(
          'Complete CO2 advice response with hourly data, info, tresholds, and location'
        )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getCo2Advice(
      ctx.input.zip || ctx.config.zip || ''
    );
    return { output: { data: result }, message: 'Retrieved CO2 consumption advice.' };
  })
  .build();

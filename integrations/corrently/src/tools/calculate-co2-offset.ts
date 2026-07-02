import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let calculateCo2Offset = SlateTool.create(spec, {
  name: 'CO2 Offset Calculator',
  key: 'calculate_co2_offset',
  description: `Calculates CO2 offset needs and compensation options for a given amount of CO2 emissions. Determines how many trees or other offsets are needed to compensate for the specified emissions amount. Useful for sustainability reporting and carbon neutrality planning.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      co2Kg: z.number().min(0.1).describe('Amount of CO2 in kilograms to offset'),
      activityType: z
        .string()
        .optional()
        .describe(
          'Category of the activity generating emissions (e.g. "flight", "car", "heating")'
        )
    })
  )
  .output(
    z.object({
      co2Kg: z.number().optional().describe('CO2 amount in kilograms'),
      treesNeeded: z.number().optional().describe('Number of trees needed for compensation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCo2Offset({
      co2Kg: ctx.input.co2Kg,
      activityType: ctx.input.activityType
    });

    return {
      output: {
        co2Kg: result.co2Kg,
        treesNeeded: result.trees
      },
      message: `To offset **${ctx.input.co2Kg} kg** of CO2${ctx.input.activityType ? ` from **${ctx.input.activityType}**` : ''}, approximately **${result.trees ?? 'N/A'}** trees are needed.`
    };
  })
  .build();

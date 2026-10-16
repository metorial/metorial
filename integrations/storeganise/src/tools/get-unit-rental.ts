import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUnitRentalTool = SlateTool.create(spec, {
  name: 'Get Unit Rental',
  key: 'get_unit_rental',
  description:
    'Retrieve a unit rental by ID, including its stored pricing, dates, state, and optional related records. Call list_unit_rentals to discover rental IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      unitRentalId: z.string().describe('Unit rental ID from list_unit_rentals'),
      include: z
        .string()
        .optional()
        .describe(
          'Comma-separated related records to include, such as unit,owner,customFields'
        )
    })
  )
  .output(
    z.object({
      unitRental: z.record(z.string(), z.any()).describe('The unit rental record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });
    let unitRental = await client.getUnitRental(ctx.input.unitRentalId, ctx.input.include);
    return {
      output: { unitRental },
      message: `Retrieved unit rental **${ctx.input.unitRentalId}**.`
    };
  })
  .build();

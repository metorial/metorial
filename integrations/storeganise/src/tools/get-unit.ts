import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUnitTool = SlateTool.create(spec, {
  name: 'Get Unit',
  key: 'get_unit',
  description: `Retrieve detailed information about a specific storage unit including its size, pricing, state, and current tenant. Optionally include related rental and custom field data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      unitId: z.string().describe('The unit ID'),
      include: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of related data to include (e.g. "rental,customFields")'
        )
    })
  )
  .output(
    z.object({
      unit: z.record(z.string(), z.any()).describe('Unit details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let unit = await client.getUnit(ctx.input.unitId, ctx.input.include);

    return {
      output: { unit },
      message: `Retrieved unit **${unit.name || unit._id}** (state: ${unit.state || 'unknown'}).`
    };
  })
  .build();

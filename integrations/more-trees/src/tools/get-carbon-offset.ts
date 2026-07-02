import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCarbonOffset = SlateTool.create(spec, {
  name: 'Get Carbon Offset',
  key: 'get_carbon_offset',
  description: `Retrieve the total cumulative carbon offset figures based on your tree planting activity. Shows the environmental impact of your reforestation contributions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      carbonOffset: z
        .record(z.string(), z.any())
        .describe('Carbon offset data from your planting activity')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicValidationKey: ctx.auth.publicValidationKey
    });

    let data = await client.getCarbonOffset();

    return {
      output: { carbonOffset: data },
      message: `Successfully retrieved carbon offset data.`
    };
  })
  .build();

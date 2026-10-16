import { SlateTool } from 'slates';
import { z } from 'zod';
import { deviceIdSchema, SensiboClient } from '../lib/client';
import { spec } from '../spec';

export let getAcStatesTool = SlateTool.create(spec, {
  name: 'Get AC State History',
  key: 'get_ac_states',
  description:
    'Retrieve the current and previous AC states for a Sensibo device. Call list_devices to discover authorized device IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      deviceId: deviceIdSchema,
      limit: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .describe(
          'Number of states to retrieve, as a whole number from 1 to 20; defaults to 10'
        )
    })
  )
  .output(z.object({ deviceId: z.string(), states: z.array(z.record(z.string(), z.any())) }))
  .handleInvocation(async ctx => {
    let client = new SensiboClient(ctx.auth.token);
    let states = await client.getAcStates(ctx.input.deviceId, ctx.input.limit ?? 10);
    return {
      output: { deviceId: client.sanitize(ctx.input.deviceId), states },
      message: `Retrieved **${states.length}** AC state record(s).`
    };
  })
  .build();

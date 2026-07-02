import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import { spec } from '../spec';

export let getFeePlans = SlateTool.create(spec, {
  name: 'Get Fee Plans',
  key: 'get_fee_plans',
  description: `Retrieve available fee plans (e.g. economy, normal, priority) for a specific cryptocurrency. Returns fee rates, gas prices, and confirmation targets for each plan.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      currency: z.string().describe('Cryptocurrency ID (e.g. BTC, ETH, LTC)')
    })
  )
  .output(
    z.object({
      plans: z
        .record(z.string(), z.any())
        .describe(
          'Available fee plans with their details (e.g. gasLimit, gasPrice, conf_target, value)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlisioClient({ token: ctx.auth.token });

    let result = await client.getFeePlans(ctx.input.currency);

    return {
      output: {
        plans: result
      },
      message: `Retrieved fee plans for **${ctx.input.currency}**.`
    };
  })
  .build();

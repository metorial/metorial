import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import { readRecord, validateOutput } from '../lib/response';
import { spec } from '../spec';

let outputSchema = z.object({
  plans: z
    .record(z.string(), z.any())
    .describe(
      'Available fee plans with their details (e.g. gasLimit, gasPrice, conf_target, value)'
    ),
  raw: z.unknown().describe('Original provider response with credentials removed')
});

export let getFeePlans = SlateTool.create(spec, {
  name: 'Get Fee Plans',
  key: 'get_fee_plans',
  description: `Retrieve available fee plans, such as normal and priority, for a specific cryptocurrency. Returns the provider's fee rates, gas prices, and confirmation targets for each plan.`,
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
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new PlisioClient({ token: ctx.auth.token });

    let result = readRecord(await client.getFeePlans(ctx.input.currency));

    return {
      output: validateOutput(outputSchema, {
        plans: result,
        raw: result
      }),
      message: client.redact(`Retrieved fee plans for **${ctx.input.currency}**.`)
    };
  })
  .build();

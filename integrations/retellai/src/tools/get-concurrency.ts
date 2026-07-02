import { SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

export let getConcurrency = SlateTool.create(spec, {
  name: 'Get Concurrency',
  key: 'get_concurrency',
  description: `Check your current call concurrency usage, limits, and purchasing capacity. Useful for monitoring capacity before launching batch campaigns.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      currentConcurrency: z.number().describe('Current number of ongoing calls'),
      concurrencyLimit: z.number().describe('Maximum allowed concurrent calls'),
      baseConcurrency: z.number().describe('Free concurrency limit'),
      purchasedConcurrency: z.number().describe('Amount of concurrency purchased'),
      concurrencyPurchaseLimit: z.number().describe('Maximum purchasable concurrency'),
      remainingPurchaseLimit: z
        .number()
        .describe('Remaining concurrency that can be purchased'),
      concurrencyBurstEnabled: z.boolean().describe('Whether burst mode is enabled'),
      concurrencyBurstLimit: z.number().describe('Maximum concurrency when burst is enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);
    let data = await client.getConcurrency();

    return {
      output: {
        currentConcurrency: data.current_concurrency,
        concurrencyLimit: data.concurrency_limit,
        baseConcurrency: data.base_concurrency,
        purchasedConcurrency: data.purchased_concurrency,
        concurrencyPurchaseLimit: data.concurrency_purchase_limit,
        remainingPurchaseLimit: data.remaining_purchase_limit,
        concurrencyBurstEnabled: data.concurrency_burst_enabled,
        concurrencyBurstLimit: data.concurrency_burst_limit
      },
      message: `Concurrency: **${data.current_concurrency}/${data.concurrency_limit}** active calls.`
    };
  })
  .build();

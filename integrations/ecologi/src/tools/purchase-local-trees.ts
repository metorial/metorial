import { SlateTool } from 'slates';
import { z } from 'zod';
import { EcologiClient } from '../lib/client';
import { purchaseDetailsShape, purchaseOptionsShape } from '../lib/schemas';
import { spec } from '../spec';

export let purchaseLocalTreesTool = SlateTool.create(spec, {
  name: 'Purchase Local Trees',
  key: 'purchase_local_trees',
  description: 'Fund tree planting in the UK, US, Australia, or Brazil through Ecologi.',
  constraints: ['Requires an Ecologi API key. Purchases are billed monthly.'],
  instructions: ['Use an idempotency key to safely retry the same purchase.'],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      numberOfTrees: z.number().int().min(1).describe('Number of local trees to purchase.'),
      country: z
        .enum(['UK', 'US', 'AU', 'BR'])
        .describe('Country where trees will be planted.'),
      ...purchaseOptionsShape
    })
  )
  .output(
    z.object({
      amount: z.number().describe('Total cost of the purchase.'),
      currency: z.string().describe('Currency of the purchase.'),
      treeUrl: z.string().describe('URL to view the trees on Ecologi.'),
      ...purchaseDetailsShape
    })
  )
  .handleInvocation(async ctx => {
    let result = await new EcologiClient(ctx.auth.token).purchaseLocalTrees(
      {
        number: ctx.input.numberOfTrees,
        country: ctx.input.country,
        name: ctx.input.fundedByName,
        test: ctx.input.testMode,
        recipientEmail: ctx.input.recipientEmail
      },
      ctx.input.idempotencyKey
    );
    let testLabel = ctx.input.testMode ? ' (test mode)' : '';
    return {
      output: { ...result, raw: result },
      message: `Purchased **${ctx.input.numberOfTrees} tree(s)** in **${ctx.input.country}**${testLabel} for **${result.amount} ${result.currency}**.`
    };
  })
  .build();

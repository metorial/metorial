import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { EcologiClient } from '../lib/client';
import { purchaseDetailsShape, purchaseOptionsShape } from '../lib/schemas';
import { spec } from '../spec';

export let purchaseTreesTool = SlateTool.create(spec, {
  name: 'Purchase Trees',
  key: 'purchase_trees',
  description:
    'Fund tree planting through Ecologi. Projects are assigned by Ecologi. To select a supported country, use purchase_local_trees. Purchases appear as pending until monthly payment succeeds.',
  constraints: ['Requires an Ecologi API key.', 'Purchases are billed monthly.'],
  instructions: ['Use an idempotency key to safely retry the same purchase.'],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      numberOfTrees: z
        .number()
        .int()
        .min(1)
        .describe('Number of trees to purchase, from 1 to 250,000.'),
      ...purchaseOptionsShape
    })
  )
  .output(
    z.object({
      amount: z.number().describe('Total cost of the purchase.'),
      currency: z.string().describe('Currency of the purchase.'),
      treeUrl: z.string().describe('URL to view the trees on Ecologi.'),
      ...purchaseDetailsShape,
      name: z.string().describe('The funded-by label returned by Ecologi.')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.numberOfTrees > 250_000) {
      throw createApiServiceError('Ecologi accepts at most 250,000 trees per purchase.', {
        reason: 'ecologi_invalid_tree_quantity'
      });
    }
    let client = new EcologiClient(ctx.auth.token);
    let result = await client.purchaseTrees(
      {
        number: ctx.input.numberOfTrees,
        name: ctx.input.fundedByName,
        test: ctx.input.testMode,
        recipientEmail: ctx.input.recipientEmail
      },
      ctx.input.idempotencyKey
    );
    let testLabel = ctx.input.testMode ? ' (test mode)' : '';
    return {
      output: { ...result, raw: result },
      message: `Purchased **${ctx.input.numberOfTrees} tree(s)**${testLabel} for **${result.amount} ${result.currency}**. [View trees](${result.treeUrl})`
    };
  })
  .build();

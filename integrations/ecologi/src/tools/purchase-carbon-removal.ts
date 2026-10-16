import { SlateTool } from 'slates';
import { z } from 'zod';
import { EcologiClient } from '../lib/client';
import { purchaseDetailsShape, purchaseOptionsShape } from '../lib/schemas';
import { spec } from '../spec';

export let purchaseCarbonRemovalTool = SlateTool.create(spec, {
  name: 'Purchase Carbon Removal',
  key: 'purchase_carbon_removal',
  description: 'Fund permanent carbon removal through Ecologi, measured in kilograms of CO₂e.',
  constraints: ['Requires an Ecologi API key. Purchases are billed monthly.'],
  instructions: ['Use an idempotency key to safely retry the same purchase.'],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      kilograms: z
        .number()
        .min(1)
        .describe('Kilograms of carbon removal to purchase, at least 1.'),
      ...purchaseOptionsShape
    })
  )
  .output(
    z.object({
      amount: z.number().describe('Total cost of the purchase.'),
      currency: z.string().describe('Currency of the purchase.'),
      tileUrl: z.string().optional().describe('URL to view this impact on Ecologi.'),
      ...purchaseDetailsShape
    })
  )
  .handleInvocation(async ctx => {
    let result = await new EcologiClient(ctx.auth.token).purchaseCarbonRemoval(
      {
        number: ctx.input.kilograms,
        name: ctx.input.fundedByName,
        test: ctx.input.testMode,
        recipientEmail: ctx.input.recipientEmail
      },
      ctx.input.idempotencyKey
    );
    let testLabel = ctx.input.testMode ? ' (test mode)' : '';
    return {
      output: { ...result, raw: result },
      message: `Purchased **${ctx.input.kilograms} kg** of carbon removal${testLabel} for **${result.amount} ${result.currency}**.`
    };
  })
  .build();

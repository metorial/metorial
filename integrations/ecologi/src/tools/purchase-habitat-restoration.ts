import { SlateTool } from 'slates';
import { z } from 'zod';
import { EcologiClient } from '../lib/client';
import { purchaseDetailsShape, purchaseOptionsShape } from '../lib/schemas';
import { spec } from '../spec';

export let purchaseHabitatRestorationTool = SlateTool.create(spec, {
  name: 'Purchase Habitat Restoration',
  key: 'purchase_habitat_restoration',
  description: 'Fund habitat restoration through Ecologi, measured in square metres.',
  constraints: ['Requires an Ecologi API key. Purchases are billed monthly.'],
  instructions: ['Use an idempotency key to safely retry the same purchase.'],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      squareMetres: z
        .number()
        .min(0.1)
        .multipleOf(0.1)
        .describe(
          'Square metres to restore, at least 0.1 and with at most one decimal place.'
        ),
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
    let result = await new EcologiClient(ctx.auth.token).purchaseHabitatRestoration(
      {
        number: ctx.input.squareMetres,
        name: ctx.input.fundedByName,
        test: ctx.input.testMode,
        recipientEmail: ctx.input.recipientEmail
      },
      ctx.input.idempotencyKey
    );
    let testLabel = ctx.input.testMode ? ' (test mode)' : '';
    return {
      output: { ...result, raw: result },
      message: `Purchased **${ctx.input.squareMetres} m²** of habitat restoration${testLabel} for **${result.amount} ${result.currency}**.`
    };
  })
  .build();

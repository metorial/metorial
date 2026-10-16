import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { EcologiClient } from '../lib/client';
import { purchaseDetailsShape, purchaseOptionsShape } from '../lib/schemas';
import { spec } from '../spec';

export let purchaseCarbonOffsetsTool = SlateTool.create(spec, {
  name: 'Purchase Carbon Offsets',
  key: 'purchase_carbon_offsets',
  description:
    'Fund carbon avoidance credits through Ecologi in kilograms or tonnes. Ecologi assigns projects and may split the funding between projects. Purchases are billed monthly.',
  constraints: ['Requires an Ecologi API key.', 'Minimum purchase is 1 KG or 0.001 Tonnes.'],
  instructions: ['Use an idempotency key to safely retry the same purchase.'],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      numberOfUnits: z
        .number()
        .min(0.001)
        .describe('Quantity: at least 1 KG or 0.001 Tonnes.'),
      units: z.enum(['KG', 'Tonnes']).describe('Unit of purchase: kilograms or tonnes.'),
      ...purchaseOptionsShape
    })
  )
  .output(
    z.object({
      numberOfUnits: z.number().describe('Number of units purchased.'),
      units: z.string().describe('Unit of purchase.'),
      numberInTonnes: z.number().describe('Equivalent quantity in tonnes.'),
      amount: z.number().describe('Total cost of the purchase.'),
      currency: z.string().describe('Currency of the purchase.'),
      tileUrl: z.string().optional().describe('URL to view this impact on Ecologi.'),
      ...purchaseDetailsShape
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.units === 'KG' && ctx.input.numberOfUnits < 1) {
      throw createApiServiceError(
        'Purchase at least 1 KG, or use Tonnes with at least 0.001.',
        {
          reason: 'ecologi_invalid_carbon_quantity'
        }
      );
    }
    let client = new EcologiClient(ctx.auth.token);
    let result = await client.purchaseCarbon(
      {
        number: ctx.input.numberOfUnits,
        units: ctx.input.units,
        name: ctx.input.fundedByName,
        test: ctx.input.testMode,
        recipientEmail: ctx.input.recipientEmail
      },
      ctx.input.idempotencyKey
    );
    let testLabel = ctx.input.testMode ? ' (test mode)' : '';
    return {
      output: { ...result, numberOfUnits: result.number, raw: result },
      message: `Purchased **${result.number} ${result.units}** of carbon avoidance${testLabel} for **${result.amount} ${result.currency}**.`
    };
  })
  .build();

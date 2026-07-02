import { SlateTool } from 'slates';
import { z } from 'zod';
import { EcologiClient } from '../lib/client';
import { spec } from '../spec';

export let purchaseCarbonOffsetsTool = SlateTool.create(spec, {
  name: 'Purchase Carbon Offsets',
  key: 'purchase_carbon_offsets',
  description: `Purchase carbon avoidance credits through Ecologi. Specify the number of units and unit type (KG or Tonnes). Carbon projects are randomly assigned from Ecologi's global mix. Purchases are billed monthly on the 1st.`,
  constraints: [
    'Requires an Ecologi API key for authentication.',
    'Minimum purchase is 1 KG or 0.001 Tonnes.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      numberOfUnits: z.number().min(0.001).describe('The number of units to purchase.'),
      units: z
        .enum(['KG', 'Tonnes'])
        .describe('The unit type for the purchase — KG or Tonnes.'),
      testMode: z
        .boolean()
        .optional()
        .describe('Set to true to simulate the transaction without actual charges.')
    })
  )
  .output(
    z.object({
      numberOfUnits: z.number().describe('The number of units purchased.'),
      units: z.string().describe('The unit type of the purchase (KG or Tonnes).'),
      numberInTonnes: z.number().describe('The equivalent number of units in tonnes.'),
      amount: z.number().describe('The total cost of this transaction.'),
      currency: z.string().describe('The currency of the amount (e.g., GBP, USD).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EcologiClient(ctx.auth.token);

    let result = await client.purchaseCarbon({
      number: ctx.input.numberOfUnits,
      units: ctx.input.units,
      test: ctx.input.testMode
    });

    let testLabel = ctx.input.testMode ? ' (test mode)' : '';

    return {
      output: {
        numberOfUnits: result.number,
        units: result.units,
        numberInTonnes: result.numberInTonnes,
        amount: result.amount,
        currency: result.currency
      },
      message: `Successfully purchased **${result.number} ${result.units}** of carbon offsets${testLabel} (${result.numberInTonnes} tonnes) for **${result.amount} ${result.currency}**.`
    };
  })
  .build();

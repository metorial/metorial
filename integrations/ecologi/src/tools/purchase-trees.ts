import { SlateTool } from 'slates';
import { z } from 'zod';
import { EcologiClient } from '../lib/client';
import { spec } from '../spec';

export let purchaseTreesTool = SlateTool.create(spec, {
  name: 'Purchase Trees',
  key: 'purchase_trees',
  description: `Purchase trees through Ecologi's reforestation projects. Trees are randomly assigned from Ecologi's global project mix — specific countries or projects cannot be chosen. Purchases are tied to your Ecologi account and displayed in your public forest. Impact created during the month shows as "Pending" until monthly payment is processed.`,
  constraints: [
    'Requires an Ecologi API key for authentication.',
    'Trees are billed on the 1st of every month.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      numberOfTrees: z
        .number()
        .int()
        .min(1)
        .describe('The number of trees to purchase (minimum 1).'),
      fundedByName: z
        .string()
        .optional()
        .describe(
          'A "funded by" label to associate with the trees (e.g., a company name or person).'
        ),
      testMode: z
        .boolean()
        .optional()
        .describe('Set to true to simulate the transaction without actual charges.')
    })
  )
  .output(
    z.object({
      amount: z.number().describe('The total cost of the tree purchase.'),
      currency: z.string().describe('The currency of the amount (e.g., GBP, USD).'),
      treeUrl: z.string().describe('A unique URL for the planted trees on Ecologi.'),
      name: z.string().describe('The funded-by name associated with the purchase.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EcologiClient(ctx.auth.token);

    let result = await client.purchaseTrees({
      number: ctx.input.numberOfTrees,
      name: ctx.input.fundedByName,
      test: ctx.input.testMode
    });

    let testLabel = ctx.input.testMode ? ' (test mode)' : '';

    return {
      output: {
        amount: result.amount,
        currency: result.currency,
        treeUrl: result.treeUrl,
        name: result.name
      },
      message: `Successfully purchased **${ctx.input.numberOfTrees} tree(s)**${testLabel} for **${result.amount} ${result.currency}**. [View trees](${result.treeUrl})`
    };
  })
  .build();

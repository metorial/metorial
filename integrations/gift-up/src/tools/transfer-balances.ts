import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let transferBalances = SlateTool.create(spec, {
  name: 'Transfer Balances',
  key: 'transfer_balances',
  description: `Transfer balances from one or more source gift cards to a single destination gift card. The source cards will be emptied and the destination card will receive the combined balance.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sourceGiftCards: z
        .array(z.string())
        .min(1)
        .describe('Gift card codes to transfer balance from'),
      destinationGiftCard: z.string().describe('Gift card code to transfer balance to'),
      reason: z.string().optional().describe('Reason for the transfer'),
      locationId: z.string().optional().describe('Location ID'),
      metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata')
    })
  )
  .output(
    z.object({
      transferredCredit: z.number().describe('Total currency amount transferred'),
      transferredUnits: z.number().nullable().describe('Total units transferred')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    let result = await client.transferBalances({
      sourceGiftCards: ctx.input.sourceGiftCards,
      destinationGiftCard: ctx.input.destinationGiftCard,
      reason: ctx.input.reason,
      locationId: ctx.input.locationId,
      metadata: ctx.input.metadata
    });

    return {
      output: result,
      message: `Transferred ${result.transferredCredit} from ${ctx.input.sourceGiftCards.length} card(s) to **${ctx.input.destinationGiftCard}**`
    };
  })
  .build();

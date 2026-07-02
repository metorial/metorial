import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { spec } from '../spec';

export let convertCurrency = SlateTool.create(spec, {
  name: 'Convert Currency',
  key: 'convert_currency',
  description: `Convert an amount between two currencies using real-time exchange rates. Supports both fiat (forex) and cryptocurrency conversions. Specify the asset type to route to the correct converter.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      from: z.string().describe('Source currency code (e.g. "USD", "BTC")'),
      to: z.string().describe('Target currency code (e.g. "EUR", "USDT")'),
      amount: z.number().describe('Amount to convert'),
      assetType: z
        .enum(['forex', 'crypto'])
        .default('forex')
        .describe('Whether to use forex or crypto converter')
    })
  )
  .output(
    z.object({
      from: z.string().describe('Source currency code'),
      to: z.string().describe('Target currency code'),
      originalAmount: z.number().describe('Original amount'),
      convertedAmount: z.number().optional().describe('Converted amount'),
      rate: z.number().optional().describe('Exchange rate used'),
      timestamp: z.number().optional().describe('Timestamp of the rate')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let { from, to, amount, assetType } = ctx.input;

    let data: any;
    if (assetType === 'crypto') {
      data = await client.convertCrypto(from.toUpperCase(), to.toUpperCase(), amount);
    } else {
      data = await client.convertCurrency(from.toUpperCase(), to.toUpperCase(), amount);
    }

    let convertedAmount = data.value ?? data.convertedAmount ?? data.amount;
    let rate = data.rate ?? (convertedAmount && amount ? convertedAmount / amount : undefined);

    let output = {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      originalAmount: amount,
      convertedAmount,
      rate,
      timestamp: data.timestamp
    };

    return {
      output,
      message: `**${amount} ${from.toUpperCase()}** = **${convertedAmount ?? 'N/A'} ${to.toUpperCase()}**${rate ? ` (rate: ${rate})` : ''}`
    };
  })
  .build();

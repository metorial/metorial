import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { finageNumber, finageRecord, finageSymbol } from '../lib/response';
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
      raw: z.unknown().optional().describe('Original provider response'),
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
    let { amount, assetType } = ctx.input;
    let from = finageSymbol(ctx.input.from);
    let to = finageSymbol(ctx.input.to);
    let data =
      assetType === 'crypto'
        ? await client.convertCrypto(from, to, amount)
        : await client.convertCurrency(from, to, amount);
    let response = finageRecord(data);
    let convertedAmount = finageNumber(response.value ?? response.convertedAmount);
    if (convertedAmount === undefined)
      throw createApiServiceError('Finage returned no converted amount.');
    let rate =
      finageNumber(response.rate) ?? (amount !== 0 ? convertedAmount / amount : undefined);
    return {
      output: {
        from,
        to,
        originalAmount: amount,
        ...pickDefined({
          convertedAmount,
          rate,
          timestamp: finageNumber(response.timestamp),
          raw: data
        })
      },
      message: `**${amount} ${from}** = **${convertedAmount} ${to}**`
    };
  })
  .build();

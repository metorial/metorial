import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTransferRate = SlateTool.create(spec, {
  name: 'Get Transfer Rate',
  key: 'get_transfer_rate',
  description: `Get a cross-currency transfer rate quote with source and destination amounts. This read does not initiate a transfer or lock a rate.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      amount: z.number().describe('Destination amount to transfer'),
      destinationCurrency: z.string().describe('Currency to send (e.g. USD, EUR, GBP)'),
      sourceCurrency: z
        .string()
        .describe('Currency to debit from your balance (e.g. NGN, KES, GHS)')
    })
  )
  .output(
    z.object({
      rate: z.number().describe('Exchange rate applied'),
      sourceAmount: z.number().describe('Amount to be debited in source currency'),
      sourceCurrency: z.string().describe('Source currency code'),
      destinationAmount: z.number().describe('Amount to be received in destination currency'),
      destinationCurrency: z.string().describe('Destination currency code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });

    let result = await client.getTransferRates(
      ctx.input.amount,
      ctx.input.destinationCurrency,
      ctx.input.sourceCurrency
    );

    let d = result.data;

    return {
      output: {
        rate: d.rate,
        sourceAmount: d.source?.amount,
        sourceCurrency: d.source?.currency,
        destinationAmount: d.destination?.amount,
        destinationCurrency: d.destination?.currency
      },
      message: `Rate: **${d.rate}**. Sending ${d.destination?.currency} ${d.destination?.amount} will cost ${d.source?.currency} ${d.source?.amount}.`
    };
  })
  .build();

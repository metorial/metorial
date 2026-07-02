import { SlateTool } from 'slates';
import { z } from 'zod';
import { PoofClient } from '../lib/client';
import { spec } from '../spec';

export let createDepositAddress = SlateTool.create(spec, {
  name: 'Create Deposit Address',
  key: 'create_deposit_address',
  description: `Generate a cryptocurrency deposit address that monitors for incoming payments. The address is monitored for a minimum of 15 minutes. Supports multiple blockchains including Ethereum, Bitcoin, Polygon, Solana, BNB, and Avalanche.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      amount: z.string().describe('Expected deposit amount in USD (e.g., "15")'),
      crypto: z
        .string()
        .describe(
          'Cryptocurrency/blockchain (e.g., "ethereum", "bitcoin", "polygon", "solana", "bnb", "avalanche")'
        ),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom metadata to attach to the deposit address')
    })
  )
  .output(
    z.object({
      address: z.string().optional().describe('Generated deposit address'),
      cryptoAmount: z.string().optional().describe('Amount in cryptocurrency'),
      charge: z.string().optional().describe('Charge identifier'),
      rate: z.string().optional().describe('Exchange rate used'),
      raw: z.any().optional().describe('Full response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PoofClient({ token: ctx.auth.token });

    let result = await client.createDepositAddress({
      amount: ctx.input.amount,
      crypto: ctx.input.crypto,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        address: result?.address,
        cryptoAmount: result?.amount?.toString(),
        charge: result?.charge?.toString(),
        rate: result?.rate?.toString(),
        raw: result
      },
      message: `Deposit address created for **${ctx.input.amount} USD** in **${ctx.input.crypto}**: \`${result?.address || 'see response'}\``
    };
  })
  .build();

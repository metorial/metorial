import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getStromkontoBalances = SlateTool.create(spec, {
  name: 'Energy Account Balances',
  key: 'get_stromkonto_balances',
  description: `Retrieves Stromkonto (energy account) balance information including GrünstromBonus tracking and CORI token balances. Returns balances across different categories (green power bonus, self-generation, CO2, etc.) with transaction history.`,
  constraints: [
    'Requires a valid Stromkonto account address (Ethereum-style address).',
    'Authenticated access with a valid token is recommended.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      account: z.string().describe('Stromkonto account address (Ethereum-style)')
    })
  )
  .output(
    z.object({
      balances: z
        .array(
          z.object({
            variation: z
              .string()
              .optional()
              .describe('Balance category (gsb, erzeugung, eigenstrom, co2, baeume)'),
            balance: z.number().optional().describe('Net balance (owned minus due)'),
            owned: z.number().optional().describe('Total amount owned by account'),
            due: z.number().optional().describe('Total amount due by account'),
            transactions: z
              .array(
                z.object({
                  transactionId: z.string().optional(),
                  transactionType: z.string().optional(),
                  value: z.number().optional(),
                  timeStamp: z.number().optional(),
                  cashier: z.string().optional()
                })
              )
              .optional()
              .describe('Recent transactions')
          })
        )
        .describe('Account balances by category')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getStromkontoBalances({ account: ctx.input.account });

    let balances = (Array.isArray(result) ? result : result.balances || []).map(
      (bal: any) => ({
        variation: bal.variation,
        balance: bal.balance,
        owned: bal.haben,
        due: bal.soll,
        transactions: (bal.txs || []).map((tx: any) => ({
          transactionId: tx.txid,
          transactionType: tx.txtype,
          value: tx.value,
          timeStamp: tx.timeStamp,
          cashier: tx.cashier
        }))
      })
    );

    return {
      output: { balances },
      message: `Retrieved **${balances.length}** balance categories for Stromkonto account \`${ctx.input.account.substring(0, 10)}...\`.`
    };
  })
  .build();

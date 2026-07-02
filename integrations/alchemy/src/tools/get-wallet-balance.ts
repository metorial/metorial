import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let getWalletBalance = SlateTool.create(spec, {
  name: 'Get Wallet Balance',
  key: 'get_wallet_balance',
  description: `Get the native currency balance (ETH, MATIC, etc.) for a wallet address, along with transaction count and current gas price.
Use this to quickly check how much native currency an address holds.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      walletAddress: z.string().describe('The wallet address to get the balance for'),
      blockTag: z
        .string()
        .optional()
        .default('latest')
        .describe(
          'Block tag to query at (e.g., "latest", "earliest", "pending", or hex block number)'
        )
    })
  )
  .output(
    z.object({
      walletAddress: z.string().describe('The queried wallet address'),
      balanceWei: z.string().describe('Balance in wei (hex)'),
      balanceEth: z.string().describe('Balance in ETH (or native currency, decimal string)'),
      transactionCount: z
        .string()
        .describe('Number of transactions sent from this address (hex)'),
      gasPrice: z.string().describe('Current gas price in hex wei')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlchemyClient({
      token: ctx.auth.token,
      network: ctx.config.network
    });

    let [balance, txCount, gasPrice] = await Promise.all([
      client.getBalance(ctx.input.walletAddress, ctx.input.blockTag),
      client.getTransactionCount(ctx.input.walletAddress, ctx.input.blockTag),
      client.getGasPrice()
    ]);

    let balanceBigInt = BigInt(balance);
    let ethValue = Number(balanceBigInt) / 1e18;
    let balanceEth = ethValue.toFixed(18).replace(/0+$/, '').replace(/\.$/, '.0');

    return {
      output: {
        walletAddress: ctx.input.walletAddress,
        balanceWei: balance,
        balanceEth,
        transactionCount: txCount,
        gasPrice
      },
      message: `Wallet \`${ctx.input.walletAddress}\` has **${balanceEth}** native tokens (${Number.parseInt(txCount, 16)} transactions).`
    };
  })
  .build();

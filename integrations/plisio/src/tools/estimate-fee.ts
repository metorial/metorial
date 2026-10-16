import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import {
  optionalValue,
  providerBoolean,
  readRecord,
  requireText,
  validateDestinations,
  validateOutput
} from '../lib/response';
import { spec } from '../spec';

let outputSchema = z.object({
  fee: z.string().optional().describe('Estimated network fee'),
  commission: z.string().optional().describe('Plisio service commission'),
  maxAmount: z.string().optional().describe('Maximum amount available for withdrawal'),
  plan: z.string().optional().describe('Fee plan used for estimation'),
  currency: z.string().optional().describe('Cryptocurrency code'),
  useWallet: z.boolean().optional().describe('Whether wallet balance will be used'),
  useWalletBalance: z.string().optional().describe('Wallet balance amount'),
  plans: z.record(z.string(), z.any()).optional().describe('Available fee plans with details'),
  raw: z.unknown().describe('Original provider response with credentials removed')
});

export let estimateFee = SlateTool.create(spec, {
  name: 'Estimate Fee',
  key: 'estimate_fee',
  description: `Estimate the network transaction fee and Plisio commission for a withdrawal before executing it. Returns both the network fee and Plisio's service commission, along with available fee plans and maximum withdrawal amount.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      currency: z.string().describe('Cryptocurrency ID (e.g. BTC, ETH, LTC)'),
      addresses: z
        .string()
        .describe(
          'Destination wallet address, or comma-separated addresses for mass withdrawal'
        ),
      amounts: z
        .string()
        .describe('Amount to send, or comma-separated amounts for each address'),
      feePlan: z.enum(['normal', 'priority']).optional().describe('Fee plan to estimate with')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    requireText(ctx.input.currency, 'Currency');
    let isMass = validateDestinations(ctx.input.addresses, ctx.input.amounts);
    let client = new PlisioClient({ token: ctx.auth.token });

    let [feeResult, commissionResult] = await Promise.all([
      client.estimateFee({
        currency: ctx.input.currency,
        addresses: ctx.input.addresses,
        amounts: ctx.input.amounts,
        feePlan: ctx.input.feePlan
      }),
      client.getCommission({
        currency: ctx.input.currency,
        addresses: ctx.input.addresses,
        amounts: ctx.input.amounts,
        feePlan: ctx.input.feePlan,
        type: isMass ? 'mass_cash_out' : 'cash_out'
      })
    ]);
    readRecord(feeResult);
    readRecord(commissionResult);

    return {
      output: validateOutput(outputSchema, {
        fee: feeResult.fee ?? commissionResult.fee,
        commission: optionalValue(commissionResult.commission),
        maxAmount: optionalValue(commissionResult.max_amount),
        plan: feeResult.plan ?? commissionResult.plan,
        currency: optionalValue(feeResult.currency ?? feeResult.psys_cid),
        useWallet: providerBoolean(commissionResult.useWallet),
        useWalletBalance: optionalValue(commissionResult.useWalletBalance),
        plans: optionalValue(commissionResult.plans),
        raw: { fee: feeResult, commission: commissionResult }
      }),
      message: client.redact(
        `Fee estimate for **${ctx.input.amounts} ${ctx.input.currency}**: Network fee **${feeResult.fee ?? 'N/A'}**, Commission **${commissionResult.commission ?? 'N/A'}**`
      )
    };
  })
  .build();

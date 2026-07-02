import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdvancedTradeClient } from '../lib/advanced-trade-client';
import { coinbaseOAuthAuthMethods } from '../lib/auth-methods';
import { spec } from '../spec';

let paymentMethodSchema = z.object({
  paymentMethodId: z.string().describe('Payment method ID'),
  paymentMethodType: z.string().optional().describe('Payment method type (ACH, CARD, etc.)'),
  name: z.string().optional().describe('Display name'),
  currency: z.string().optional().describe('Currency code'),
  verified: z.boolean().optional().describe('Whether the method is verified'),
  allowBuy: z.boolean().optional().describe('Whether buys are allowed'),
  allowSell: z.boolean().optional().describe('Whether sells are allowed'),
  allowDeposit: z.boolean().optional().describe('Whether deposits are allowed'),
  allowWithdraw: z.boolean().optional().describe('Whether withdrawals are allowed'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Update timestamp')
});

let mapPaymentMethod = (paymentMethod: any): z.infer<typeof paymentMethodSchema> => ({
  paymentMethodId: paymentMethod.id,
  paymentMethodType: paymentMethod.type,
  name: paymentMethod.name,
  currency: paymentMethod.currency,
  verified: paymentMethod.verified,
  allowBuy: paymentMethod.allow_buy,
  allowSell: paymentMethod.allow_sell,
  allowDeposit: paymentMethod.allow_deposit,
  allowWithdraw: paymentMethod.allow_withdraw,
  createdAt: paymentMethod.created_at,
  updatedAt: paymentMethod.updated_at
});

export let listPaymentMethods = SlateTool.create(spec, {
  name: 'List Payment Methods',
  key: 'list_payment_methods',
  description:
    'List linked Coinbase payment methods, or get one payment method by ID. Useful before buys, sells, deposits, and withdrawals.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .authMethods(coinbaseOAuthAuthMethods)
  .input(
    z.object({
      paymentMethodId: z
        .string()
        .optional()
        .describe('Specific payment method ID to retrieve. If omitted, lists methods.')
    })
  )
  .output(
    z.object({
      paymentMethod: paymentMethodSchema.optional().describe('Single payment method'),
      paymentMethods: z
        .array(paymentMethodSchema)
        .optional()
        .describe('Linked payment methods')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdvancedTradeClient({ token: ctx.auth.token });

    if (ctx.input.paymentMethodId) {
      let paymentMethod = await client.getPaymentMethod(ctx.input.paymentMethodId);
      return {
        output: {
          paymentMethod: mapPaymentMethod(paymentMethod)
        },
        message: `Retrieved payment method **${paymentMethod.name || paymentMethod.id}**`
      };
    }

    let result = await client.listPaymentMethods();
    let paymentMethods = result.payment_methods || [];
    return {
      output: {
        paymentMethods: paymentMethods.map(mapPaymentMethod)
      },
      message: `Found **${paymentMethods.length}** payment method(s)`
    };
  })
  .build();

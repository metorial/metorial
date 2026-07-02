import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoodyClient } from '../lib/client';
import { spec } from '../spec';

let paymentMethodSchema = z.object({
  paymentMethodId: z.string().describe('Payment method ID'),
  type: z.string().nullable().describe('Payment method type'),
  last4: z.string().nullable().describe('Last 4 digits of the card'),
  brandName: z.string().nullable().describe('Card brand (e.g. Visa, Mastercard)'),
  expMonth: z.number().nullable().describe('Card expiration month'),
  expYear: z.number().nullable().describe('Card expiration year')
});

export let listPaymentMethods = SlateTool.create(spec, {
  name: 'List Payment Methods',
  key: 'list_payment_methods',
  description: `List all payment methods on the account. Use the payment method ID when creating order batches to specify which payment method to charge.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      paymentMethods: z.array(paymentMethodSchema).describe('List of payment methods')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoodyClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listPaymentMethods();

    let paymentMethods = (Array.isArray(result) ? result : result.data || []).map(
      (pm: any) => ({
        paymentMethodId: pm.id,
        type: pm.type,
        last4: pm.last4 || pm.last_4,
        brandName: pm.brand || pm.brand_name,
        expMonth: pm.exp_month,
        expYear: pm.exp_year
      })
    );

    return {
      output: { paymentMethods },
      message: `Found **${paymentMethods.length}** payment method(s).`
    };
  })
  .build();

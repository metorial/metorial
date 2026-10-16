import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGoodyClient } from '../lib/client';
import { spec } from '../spec';

let paymentMethodSchema = z.object({
  paymentMethodId: z.string().describe('Payment method ID'),
  type: z.string().nullable().describe('Payment method type'),
  last4: z.string().nullable().describe('Last 4 digits of the card'),
  brandName: z.string().nullable().describe('Card brand (e.g. Visa, Mastercard)'),
  expMonth: z.number().nullable().describe('Card expiration month'),
  expYear: z.number().nullable().describe('Card expiration year'),
  name: z.string().optional().describe('Payment method display name'),
  cardholderName: z.string().nullable().optional().describe('Cardholder name when available'),
  balance: z
    .number()
    .nullable()
    .optional()
    .describe('Available balance in cents for payment methods that hold a balance')
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
    let client = createGoodyClient(ctx);

    let result = await client.listPaymentMethods();

    let paymentMethods = (Array.isArray(result) ? result : result.data || []).map(
      (pm: any) => ({
        paymentMethodId: pm.id,
        type: pm.type ?? null,
        last4: pm.last4 ?? pm.last_4 ?? null,
        brandName: pm.brand ?? pm.brand_name ?? null,
        expMonth: pm.exp_month ?? null,
        expYear: pm.exp_year ?? null,
        name: pm.name,
        cardholderName: pm.cardholder_name ?? null,
        balance: pm.balance ?? null
      })
    );

    return {
      output: { paymentMethods },
      message: `Found **${paymentMethods.length}** payment method(s).`
    };
  })
  .build();

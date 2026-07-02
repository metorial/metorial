import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

let paymentMethodSchema = z.object({
  paymentMethodId: z.number().describe('Payment method ID'),
  type: z.string().optional().describe('Payment method type (e.g., credit-card, marketplace)'),
  creditCardEndsWith: z.string().optional().describe('Last digits of credit card'),
  expirationMonth: z.number().optional().describe('Card expiration month'),
  expirationYear: z.number().optional().describe('Card expiration year')
});

export let listPaymentMethods = SlateTool.create(spec, {
  name: 'List Payment Methods',
  key: 'list_payment_methods',
  description: `List all payment methods associated with the Redis Cloud account. Returns payment method IDs needed for creating or updating subscriptions.`,
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
    let client = new RedisCloudClient(ctx.auth);
    let data = await client.listPaymentMethods();
    let rawMethods = data?.paymentMethods || data || [];
    if (!Array.isArray(rawMethods)) rawMethods = [];

    let paymentMethods = rawMethods.map((m: any) => ({
      paymentMethodId: m.id,
      type: m.type,
      creditCardEndsWith: m.creditCardEndsWith,
      expirationMonth: m.expirationMonth,
      expirationYear: m.expirationYear
    }));

    return {
      output: { paymentMethods },
      message: `Found **${paymentMethods.length}** payment method(s).`
    };
  })
  .build();

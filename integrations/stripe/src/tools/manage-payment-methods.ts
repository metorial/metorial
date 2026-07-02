import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';

let mapPaymentMethod = (paymentMethod: any) => ({
  paymentMethodId: paymentMethod.id,
  type: paymentMethod.type,
  customerId: paymentMethod.customer ?? null,
  billingName: paymentMethod.billing_details?.name ?? null,
  billingEmail: paymentMethod.billing_details?.email ?? null,
  cardBrand: paymentMethod.card?.brand,
  cardLast4: paymentMethod.card?.last4,
  created: paymentMethod.created
});

export let managePaymentMethods = SlateTool.create(spec, {
  name: 'Manage Payment Methods',
  key: 'manage_payment_methods',
  description:
    'Retrieve, list, attach, or detach Stripe PaymentMethods for customer billing and saved payment flows.',
  instructions: [
    'Use list_customer to inspect saved payment methods for a customer.',
    'Stripe recommends SetupIntents or PaymentIntents with setup_future_usage before attaching payment methods for future use.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'get_customer', 'list_customer', 'attach', 'detach'])
        .describe('Operation to perform'),
      paymentMethodId: z
        .string()
        .optional()
        .describe('PaymentMethod ID (required for get, get_customer, attach, detach)'),
      customerId: z
        .string()
        .optional()
        .describe('Customer ID (required for get_customer, list_customer, attach)'),
      type: z
        .string()
        .optional()
        .describe('Payment method type filter, for example card or us_bank_account'),
      setAsDefaultForInvoices: z
        .boolean()
        .optional()
        .describe('After attach, set as customer invoice default payment method'),
      limit: z.number().optional().describe('Max results (for list_customer)'),
      startingAfter: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      paymentMethodId: z.string().optional().describe('PaymentMethod ID'),
      type: z.string().optional().describe('Payment method type'),
      customerId: z.string().optional().nullable().describe('Associated customer ID'),
      billingName: z.string().optional().nullable().describe('Billing name'),
      billingEmail: z.string().optional().nullable().describe('Billing email'),
      cardBrand: z.string().optional().describe('Card brand'),
      cardLast4: z.string().optional().describe('Card last four digits'),
      created: z.number().optional().describe('Creation timestamp'),
      detached: z.boolean().optional().describe('Whether the payment method was detached'),
      paymentMethods: z
        .array(
          z.object({
            paymentMethodId: z.string(),
            type: z.string(),
            customerId: z.string().nullable(),
            billingName: z.string().optional().nullable(),
            billingEmail: z.string().optional().nullable(),
            cardBrand: z.string().optional(),
            cardLast4: z.string().optional(),
            created: z.number()
          })
        )
        .optional()
        .describe('List of customer PaymentMethods'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StripeClient({
      token: ctx.auth.token,
      stripeAccountId: ctx.config.stripeAccountId
    });

    let { action } = ctx.input;

    if (action === 'get') {
      if (!ctx.input.paymentMethodId)
        throw stripeServiceError('paymentMethodId is required for get action');
      let paymentMethod = await client.getPaymentMethod(ctx.input.paymentMethodId);
      return {
        output: mapPaymentMethod(paymentMethod),
        message: `PaymentMethod **${paymentMethod.id}** — type: ${paymentMethod.type}`
      };
    }

    if (action === 'get_customer') {
      if (!ctx.input.customerId)
        throw stripeServiceError('customerId is required for get_customer action');
      if (!ctx.input.paymentMethodId)
        throw stripeServiceError('paymentMethodId is required for get_customer action');

      let paymentMethod = await client.getCustomerPaymentMethod(
        ctx.input.customerId,
        ctx.input.paymentMethodId
      );
      return {
        output: mapPaymentMethod(paymentMethod),
        message: `PaymentMethod **${paymentMethod.id}** for customer **${ctx.input.customerId}**`
      };
    }

    if (action === 'attach') {
      if (!ctx.input.paymentMethodId)
        throw stripeServiceError('paymentMethodId is required for attach action');
      if (!ctx.input.customerId)
        throw stripeServiceError('customerId is required for attach action');

      let paymentMethod = await client.attachPaymentMethod(ctx.input.paymentMethodId, {
        customer: ctx.input.customerId
      });

      if (ctx.input.setAsDefaultForInvoices) {
        await client.updateCustomer(ctx.input.customerId, {
          invoice_settings: { default_payment_method: paymentMethod.id }
        });
      }

      return {
        output: mapPaymentMethod(paymentMethod),
        message: `Attached PaymentMethod **${paymentMethod.id}** to customer **${ctx.input.customerId}**`
      };
    }

    if (action === 'detach') {
      if (!ctx.input.paymentMethodId)
        throw stripeServiceError('paymentMethodId is required for detach action');
      let paymentMethod = await client.detachPaymentMethod(ctx.input.paymentMethodId);
      return {
        output: { ...mapPaymentMethod(paymentMethod), detached: true },
        message: `Detached PaymentMethod **${paymentMethod.id}**`
      };
    }

    if (!ctx.input.customerId)
      throw stripeServiceError('customerId is required for list_customer action');

    let params: Record<string, any> = {};
    if (ctx.input.type) params.type = ctx.input.type;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;

    let result = await client.listCustomerPaymentMethods(ctx.input.customerId, params);
    return {
      output: {
        paymentMethods: result.data.map((paymentMethod: any) =>
          mapPaymentMethod(paymentMethod)
        ),
        hasMore: result.has_more
      },
      message: `Found **${result.data.length}** PaymentMethod(s) for customer **${ctx.input.customerId}**`
    };
  })
  .build();

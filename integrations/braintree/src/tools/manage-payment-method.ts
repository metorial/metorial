import { SlateTool } from 'slates';
import { z } from 'zod';
import { BraintreeGraphQLClient, BraintreeRestClient } from '../lib/client';
import { VAULT_PAYMENT_METHOD } from '../lib/graphql-queries';
import { parseXml } from '../lib/xml';
import { spec } from '../spec';

let paymentMethodOutputSchema = z.object({
  paymentMethodId: z.string().optional().describe('GraphQL payment method ID'),
  legacyId: z.string().optional().describe('Legacy payment method token'),
  type: z.string().optional().describe('Payment method type'),
  last4: z.string().optional().nullable().describe('Last 4 digits (cards)'),
  cardBrand: z.string().optional().nullable().describe('Card brand (cards)'),
  expirationMonth: z.string().optional().nullable().describe('Expiration month (cards)'),
  expirationYear: z.string().optional().nullable().describe('Expiration year (cards)'),
  cardholderName: z.string().optional().nullable().describe('Cardholder name'),
  email: z.string().optional().nullable().describe('Email (PayPal/Venmo)'),
  customerId: z.string().optional().nullable().describe('Associated customer ID'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let vaultPaymentMethod = SlateTool.create(spec, {
  name: 'Vault Payment Method',
  key: 'vault_payment_method',
  description: `Stores a payment method in the Braintree vault for future use. Takes a single-use payment method ID (nonce) and converts it to a reusable vaulted payment method.
By default, credit cards are verified before vaulting.`,
  instructions: [
    'The paymentMethodId must be a single-use payment method ID obtained from client-side tokenization.',
    'Credit cards are automatically verified unless you disable verification.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      paymentMethodId: z.string().describe('Single-use payment method ID to vault'),
      customerId: z
        .string()
        .optional()
        .describe('Customer ID to associate the payment method with'),
      verifyCard: z
        .boolean()
        .optional()
        .describe('Whether to verify the card before vaulting (default: true for cards)')
    })
  )
  .output(
    z.object({
      paymentMethodId: z.string().optional().describe('GraphQL payment method ID'),
      legacyId: z.string().optional().describe('Legacy payment method token'),
      type: z.string().optional().describe('Payment method type'),
      last4: z.string().optional().nullable(),
      cardBrand: z.string().optional().nullable(),
      expirationMonth: z.string().optional().nullable(),
      expirationYear: z.string().optional().nullable(),
      cardholderName: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      customerId: z.string().optional().nullable(),
      createdAt: z.string().optional(),
      verificationStatus: z
        .string()
        .optional()
        .nullable()
        .describe('Verification status if a card was verified')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BraintreeGraphQLClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let input: Record<string, any> = {
      paymentMethodId: ctx.input.paymentMethodId
    };
    if (ctx.input.customerId) {
      input.customerId = ctx.input.customerId;
    }
    if (ctx.input.verifyCard === false) {
      input.verification = { skipVerification: true };
    }

    let result = await client.query(VAULT_PAYMENT_METHOD, { input });
    let pm = result.vaultPaymentMethod.paymentMethod;
    let verification = result.vaultPaymentMethod.verification;
    let details = pm.details || {};

    let type = 'unknown';
    if (details.brandCode || details.last4) type = 'credit_card';
    else if (details.email && !details.username) type = 'paypal';
    else if (details.username) type = 'venmo';
    else if (details.bankName) type = 'us_bank_account';

    return {
      output: {
        paymentMethodId: pm.id,
        legacyId: pm.legacyId,
        type,
        last4: details.last4 || null,
        cardBrand: details.brandCode || null,
        expirationMonth: details.expirationMonth || null,
        expirationYear: details.expirationYear || null,
        cardholderName: details.cardholderName || null,
        email: details.email || null,
        customerId: pm.customer?.id || null,
        createdAt: pm.createdAt,
        verificationStatus: verification?.status || null
      },
      message: `Payment method vaulted — \`${pm.legacyId}\` (${type})${verification?.status ? ` — verification: **${verification.status}**` : ''}`
    };
  })
  .build();

export let findPaymentMethod = SlateTool.create(spec, {
  name: 'Find Payment Method',
  key: 'find_payment_method',
  description: `Retrieves details of a vaulted payment method by its token from the Braintree vault.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      paymentMethodToken: z.string().describe('The payment method token to look up')
    })
  )
  .output(paymentMethodOutputSchema)
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    let xml = await rest.get(`/payment_methods/any/${ctx.input.paymentMethodToken}`);
    let parsed = parseXml(xml);

    // Could be credit-card, paypal-account, etc.
    let pm =
      parsed.creditCard ||
      parsed.paypalAccount ||
      parsed.venmoAccount ||
      parsed.usBankAccount ||
      parsed;
    let type = parsed.creditCard
      ? 'credit_card'
      : parsed.paypalAccount
        ? 'paypal'
        : parsed.venmoAccount
          ? 'venmo'
          : parsed.usBankAccount
            ? 'us_bank_account'
            : 'unknown';

    return {
      output: {
        paymentMethodId: undefined,
        legacyId: pm.token || ctx.input.paymentMethodToken,
        type,
        last4: pm.last4 || null,
        cardBrand: pm.cardType || null,
        expirationMonth: pm.expirationMonth || null,
        expirationYear: pm.expirationYear || null,
        cardholderName: pm.cardholderName || null,
        email: pm.email || null,
        customerId: pm.customerId || null,
        createdAt: pm.createdAt
      },
      message: `Payment method \`${ctx.input.paymentMethodToken}\` — ${type}${pm.last4 ? ` ending in ${pm.last4}` : ''}`
    };
  })
  .build();

export let deletePaymentMethod = SlateTool.create(spec, {
  name: 'Delete Payment Method',
  key: 'delete_payment_method',
  description: `Removes a payment method from the Braintree vault. This is irreversible and will fail if the payment method has active subscriptions.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      paymentMethodToken: z.string().describe('The payment method token to delete')
    })
  )
  .output(
    z.object({
      paymentMethodToken: z.string().describe('The deleted payment method token'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    await rest.delete(`/payment_methods/any/${ctx.input.paymentMethodToken}`);

    return {
      output: {
        paymentMethodToken: ctx.input.paymentMethodToken,
        deleted: true
      },
      message: `Payment method \`${ctx.input.paymentMethodToken}\` deleted from vault`
    };
  })
  .build();

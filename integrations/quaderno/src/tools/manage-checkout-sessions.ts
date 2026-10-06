import { z } from 'zod';
import { checkoutOutput, fields, mapCheckout, metadata } from '../lib/schemas';
import { tool } from '../lib/tool';
import {
  countryInput,
  currencyInput,
  decimal,
  decimalInput,
  idInput,
  invalid,
  pageInput,
  pageOutput,
  safeInteger,
  textInput
} from '../lib/validation';

const item = z.object({
  productCode: textInput
    .optional()
    .describe('SKU of an existing product, required by the current checkout API.'),
  description: z.string().optional(),
  amount: decimalInput.optional(),
  quantity: safeInteger.positive().optional(),
  currency: currencyInput.optional()
});
export const listCheckoutSessions = tool({
  name: 'List Checkout Sessions',
  key: 'list_checkout_sessions',
  description:
    'List one cursor page of checkout sessions, or retrieve a session with sessionId alone.',
  readOnly: true,
  input: { ...pageInput, sessionId: idInput.optional() },
  output: { sessions: z.array(z.object(checkoutOutput)), ...pageOutput },
  run: async (input, client) => {
    if (input.sessionId) {
      if (Object.entries(input).some(([k, v]) => k !== 'sessionId' && v !== undefined))
        throw invalid('Use sessionId alone for an exact checkout read.');
      return {
        sessions: [mapCheckout(await client.get('checkout/sessions', input.sessionId))]
      };
    }
    return {
      sessions: (await client.list('checkout/sessions', input)).map(mapCheckout),
      ...client.pagination
    };
  }
});
export const createCheckoutSession = tool({
  name: 'Create Checkout Session',
  key: 'create_checkout_session',
  description:
    'Create a checkout session for a customer to complete payment. Requires existing product SKUs and success/cancel URLs. Session creation does not confirm payment.',
  input: {
    successUrl: z.string().url(),
    cancelUrl: z.string().url(),
    currency: currencyInput.optional().describe('Default currency for supplied items.'),
    customerEmail: z.string().email().optional(),
    customerTaxId: z.string().optional(),
    customerCountry: countryInput.optional(),
    billingAddressCollection: z.boolean().optional(),
    items: z.array(item).min(1).max(200).optional(),
    customMetadata: z.record(z.string().max(40), z.string().max(500)).optional()
  },
  output: checkoutOutput,
  run: async (input, client) => {
    if (!input.items?.length)
      throw invalid(
        'Supply at least one checkout item with a productCode from list_products.'
      );
    for (const link of [input.successUrl, input.cancelUrl]) {
      const url = new URL(link);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
        throw invalid('Use an HTTP(S) redirect URL without embedded credentials.');
    }
    const data = {
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer: fields(input, {
        customerEmail: 'email',
        customerTaxId: 'tax_id',
        customerCountry: 'billing_country'
      }),
      billing_details_collection:
        input.billingAddressCollection === undefined
          ? undefined
          : input.billingAddressCollection
            ? 'required'
            : 'auto',
      metadata: metadata(input.customMetadata),
      items: input.items.map(value => {
        if (!value.productCode) throw invalid('Each checkout item requires productCode.');
        return {
          product: value.productCode,
          description: value.description,
          amount: value.amount === undefined ? undefined : decimal(value.amount),
          quantity: value.quantity,
          currency: value.currency ?? input.currency
        };
      })
    };
    return mapCheckout(await client.create('checkout/sessions', data));
  }
});

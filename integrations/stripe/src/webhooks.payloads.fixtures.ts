// Reduced field excerpts from Stripe's published object examples, checked 2026-09-15.
// Lifecycle changes in the tests are explicit adaptations, not captured deliveries.
// Non-mapped fields are omitted; no client secrets or bank details are retained.
export const stripePayloadExamples = {
  // Payload example: https://docs.stripe.com/api/payment_intents/object
  payment_intent: {
    id: 'pi_3MtwBwLkdIwHu7ix28a3tqPa',
    object: 'payment_intent',
    amount: 2000,
    created: 1680800504,
    currency: 'usd',
    customer: null,
    description: null,
    last_payment_error: null,
    status: 'requires_payment_method'
  },
  // Payload example: https://docs.stripe.com/api/charges/object
  charge: {
    id: 'ch_3MmlLrLkdIwHu7ix0snN0B15',
    object: 'charge',
    amount: 1099,
    created: 1679090539,
    currency: 'usd',
    customer: null,
    description: null,
    failure_message: null,
    receipt_url:
      'https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xTTJKVGtMa2RJd0h1N2l4KOvG06AGMgZfBXyr1aw6LBa9vaaSRWU96d8qBwz9z2J_CObiV_H2-e8RezSK_sw0KISesp4czsOUlVKY',
    status: 'succeeded'
  },
  // Payload example: https://docs.stripe.com/api/refunds/object
  refund: {
    id: 're_1Nispe2eZvKYlo2Cd31jOCgZ',
    object: 'refund',
    amount: 1000,
    created: 1692942318,
    currency: 'usd',
    status: 'succeeded'
  },
  // Payload example: https://docs.stripe.com/api/disputes/object
  dispute: {
    id: 'du_1MtJUT2eZvKYlo2CNaw2HvEv',
    object: 'dispute',
    amount: 1000,
    created: 1680651737,
    currency: 'usd',
    status: 'warning_needs_response'
  },
  // Payload example: https://docs.stripe.com/api/customers/object
  customer: {
    id: 'cus_NffrFeUfNV2Hib',
    object: 'customer',
    created: 1680893993,
    description: null,
    email: 'jennyrosen@example.com',
    name: 'Jenny Rosen',
    phone: null
  },
  // Payload example: https://docs.stripe.com/api/cards/object
  card: {
    id: 'card_1MvoiELkdIwHu7ixOeFGbN9D',
    object: 'card',
    customer: 'cus_NhD8HD2bY8dP3V',
    name: null
  },
  // Payload example: https://docs.stripe.com/api/customer_bank_accounts/object
  bank_account: {
    id: 'ba_1MvoIJ2eZvKYlo2CO9f0MabO',
    object: 'bank_account',
    customer: 'cus_9s6XI9OFIdpjIg',
    status: 'new'
  },
  // Payload example: https://docs.stripe.com/api/subscriptions/object
  subscription: {
    id: 'sub_1MowQVLkdIwHu7ixeRlqHVzs',
    object: 'subscription',
    cancel_at_period_end: false,
    canceled_at: null,
    created: 1679609767,
    customer: 'cus_Na6dX7aXxi11N4',
    items: {
      object: 'list',
      data: [
        {
          id: 'si_Na6dzxczY5fwHx',
          object: 'subscription_item',
          current_period_end: 1682288167,
          current_period_start: 1679609767,
          price: {
            id: 'price_1MowQULkdIwHu7ixraBm864M',
            object: 'price',
            currency: 'usd',
            type: 'recurring'
          },
          quantity: 1
        }
      ],
      has_more: false
    },
    status: 'active',
    trial_start: null,
    trial_end: null
  },
  // Payload example: https://docs.stripe.com/api/invoices/object
  invoice: {
    id: 'in_1MtHbELkdIwHu7ixl4OzzPMv',
    object: 'invoice',
    amount_due: 0,
    amount_paid: 0,
    created: 1680644467,
    currency: 'usd',
    customer: 'cus_NeZwdNtLEOXuvB',
    hosted_invoice_url: null,
    invoice_pdf: null,
    parent: null,
    status: 'draft',
    total: 0
  },
  // Payload example: https://docs.stripe.com/api/checkout/sessions/object
  checkout: {
    id: 'cs_test_a11YYufWQzNY63zpQ6QSNRQhkUpVph4WRmzW0zWJO2znZKdVujZ0N0S22u',
    object: 'checkout.session',
    amount_total: 2198,
    created: 1679600215,
    currency: 'usd',
    customer: null,
    customer_details: null,
    customer_email: null,
    mode: 'payment',
    payment_intent: null,
    payment_status: 'unpaid',
    status: 'open',
    subscription: null
  },
  // Payload example: https://docs.stripe.com/api/payouts/object
  payout: {
    id: 'po_1OaFDbEcg9tTZuTgNYmX0PKB',
    object: 'payout',
    amount: 1100,
    arrival_date: 1680652800,
    created: 1680648691,
    currency: 'usd',
    failure_message: null,
    method: 'standard',
    status: 'pending'
  },
  // Payload example: https://docs.stripe.com/api/sources/attach
  source: {
    id: 'src_1NfRGv2eZvKYlo2Cv7NAImBL',
    object: 'source',
    amount: 1000,
    created: 1692121393,
    currency: 'usd',
    customer: 'cus_9s6XKzkNRiz8i3',
    status: 'chargeable',
    owner: {
      email: 'jenny.rosen@example.com',
      name: null
    }
  }
};

export const expectedStripeOutputs = {
  payment_intent: {
    resourceId: 'pi_3MtwBwLkdIwHu7ix28a3tqPa',
    resourceType: 'payment_intent',
    amount: 2000,
    currency: 'usd',
    status: 'requires_payment_method',
    customerId: null,
    description: null,
    failureMessage: null,
    receiptUrl: null,
    created: 1680800504
  },
  charge: {
    resourceId: 'ch_3MmlLrLkdIwHu7ix0snN0B15',
    resourceType: 'charge',
    amount: 1099,
    currency: 'usd',
    status: 'succeeded',
    customerId: null,
    description: null,
    failureMessage: null,
    receiptUrl:
      'https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xTTJKVGtMa2RJd0h1N2l4KOvG06AGMgZfBXyr1aw6LBa9vaaSRWU96d8qBwz9z2J_CObiV_H2-e8RezSK_sw0KISesp4czsOUlVKY',
    created: 1679090539
  },
  refund: {
    resourceId: 're_1Nispe2eZvKYlo2Cd31jOCgZ',
    resourceType: 'refund',
    amount: 1000,
    currency: 'usd',
    status: 'succeeded',
    customerId: null,
    description: null,
    failureMessage: null,
    receiptUrl: null,
    created: 1692942318
  },
  dispute: {
    resourceId: 'du_1MtJUT2eZvKYlo2CNaw2HvEv',
    resourceType: 'dispute',
    amount: 1000,
    currency: 'usd',
    status: 'warning_needs_response',
    customerId: null,
    description: null,
    failureMessage: null,
    receiptUrl: null,
    created: 1680651737
  },
  customer: {
    customerId: 'cus_NffrFeUfNV2Hib',
    email: 'jennyrosen@example.com',
    name: 'Jenny Rosen',
    phone: null,
    description: null,
    deleted: false,
    created: 1680893993
  },
  card: {
    customerId: 'cus_NhD8HD2bY8dP3V',
    email: null,
    name: null,
    phone: null,
    description: null,
    deleted: false
  },
  bank_account: {
    customerId: 'cus_9s6XI9OFIdpjIg',
    email: null,
    name: null,
    phone: null,
    description: null,
    deleted: false
  },
  source: {
    customerId: 'cus_9s6XKzkNRiz8i3',
    email: null,
    name: null,
    phone: null,
    description: null,
    deleted: false
  },
  subscription: {
    subscriptionId: 'sub_1MowQVLkdIwHu7ixeRlqHVzs',
    customerId: 'cus_Na6dX7aXxi11N4',
    status: 'active',
    items: [
      {
        subscriptionItemId: 'si_Na6dzxczY5fwHx',
        priceId: 'price_1MowQULkdIwHu7ixraBm864M',
        quantity: 1,
        currentPeriodStart: 1679609767,
        currentPeriodEnd: 1682288167
      }
    ],
    itemsHasMore: false,
    currentPeriodStart: 1679609767,
    currentPeriodEnd: 1682288167,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    trialStart: null,
    trialEnd: null,
    created: 1679609767
  },
  invoice: {
    invoiceId: 'in_1MtHbELkdIwHu7ixl4OzzPMv',
    customerId: 'cus_NeZwdNtLEOXuvB',
    subscriptionId: null,
    status: 'draft',
    total: 0,
    amountDue: 0,
    amountPaid: 0,
    currency: 'usd',
    hostedInvoiceUrl: null,
    invoicePdf: null,
    created: 1680644467
  },
  checkout: {
    sessionId: 'cs_test_a11YYufWQzNY63zpQ6QSNRQhkUpVph4WRmzW0zWJO2znZKdVujZ0N0S22u',
    customerId: null,
    customerEmail: null,
    mode: 'payment',
    paymentStatus: 'unpaid',
    status: 'open',
    amountTotal: 2198,
    currency: 'usd',
    paymentIntentId: null,
    subscriptionId: null
  },
  payout: {
    payoutId: 'po_1OaFDbEcg9tTZuTgNYmX0PKB',
    amount: 1100,
    currency: 'usd',
    status: 'pending',
    method: 'standard',
    arrivalDate: 1680652800,
    failureMessage: null,
    created: 1680648691
  }
};

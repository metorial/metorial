import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let paidTransactionCreated = SlateTrigger.create(spec, {
  name: 'Paid Transaction Created',
  key: 'paid_transaction_created',
  description:
    'Triggered when a new paid transaction (direct payment for access) is recorded. Configure the webhook in the HotspotSystem Control Center under Tools & Settings > Webhooks with the event type "transaction.paid.create".'
})
  .input(
    z.object({
      transactionId: z.string().describe('Unique transaction identifier'),
      operator: z.string().describe('Operator name'),
      locationId: z.string().describe('Location ID'),
      userName: z.string().describe('Username'),
      customer: z.string().describe('Customer identifier'),
      actionDateGmt: z.string().describe('Transaction timestamp in GMT'),
      amount: z.string().describe('Payment amount'),
      currency: z.string().describe('Payment currency'),
      userAgent: z.string().describe('Device user agent'),
      newsletter: z.string().describe('Newsletter opt-in status'),
      companyName: z.string().describe('Company name'),
      email: z.string().describe('Email address'),
      address: z.string().describe('Street address'),
      city: z.string().describe('City'),
      state: z.string().describe('State or province'),
      zip: z.string().describe('ZIP or postal code'),
      countryCode: z.string().describe('Country code'),
      phone: z.string().describe('Phone number'),
      language: z.string().describe('User language'),
      smsCountry: z.string().describe('SMS country'),
      rawPayload: z.record(z.string(), z.any()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Unique transaction identifier'),
      operator: z.string().describe('Operator name'),
      locationId: z.string().describe('Location ID'),
      userName: z.string().describe('Username'),
      customer: z.string().describe('Customer identifier'),
      actionDateGmt: z.string().describe('Transaction timestamp in GMT'),
      amount: z.string().describe('Payment amount'),
      currency: z.string().describe('Payment currency'),
      userAgent: z.string().describe('Device user agent'),
      newsletter: z.string().describe('Newsletter opt-in status'),
      companyName: z.string().describe('Company name'),
      email: z.string().describe('Email address'),
      address: z.string().describe('Street address'),
      city: z.string().describe('City'),
      state: z.string().describe('State or province'),
      zip: z.string().describe('ZIP or postal code'),
      countryCode: z.string().describe('Country code'),
      phone: z.string().describe('Phone number'),
      language: z.string().describe('User language'),
      smsCountry: z.string().describe('SMS country')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let input = {
        transactionId: String(data.id ?? ''),
        operator: data.operator ?? '',
        locationId: String(data.location_id ?? ''),
        userName: data.user_name ?? '',
        customer: data.customer ?? '',
        actionDateGmt: data.action_date_gmt ?? '',
        amount: data.amount ?? '',
        currency: data.currency ?? '',
        userAgent: data.user_agent ?? '',
        newsletter: data.newsletter ?? '',
        companyName: data.company_name ?? '',
        email: data.email ?? '',
        address: data.address ?? '',
        city: data.city ?? '',
        state: data.state ?? '',
        zip: data.zip ?? '',
        countryCode: data.country_code ?? '',
        phone: data.phone ?? '',
        language: data.language ?? '',
        smsCountry: data.smscountry ?? '',
        rawPayload: data
      };

      return {
        inputs: [input]
      };
    },

    handleEvent: async ctx => {
      let { rawPayload, ...transactionData } = ctx.input;

      return {
        type: 'transaction.paid.created',
        id: ctx.input.transactionId || `paid-tx-${Date.now()}`,
        output: transactionData
      };
    }
  })
  .build();

import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let macTransactionCreated = SlateTrigger.create(spec, {
  name: 'MAC Transaction Created',
  key: 'mac_transaction_created',
  description:
    'Triggered when a new MAC-based (device) access transaction is recorded. Configure the webhook in the HotspotSystem Control Center under Tools & Settings > Webhooks with the event type "transaction.mac.create".'
})
  .input(
    z.object({
      transactionId: z.string().describe('Unique transaction identifier'),
      operator: z.string().describe('Operator name'),
      locationId: z.string().describe('Location ID'),
      userName: z.string().describe('Username'),
      actionDateGmt: z.string().describe('Transaction timestamp in GMT'),
      packageId: z.string().describe('Package ID'),
      userAgent: z.string().describe('Device user agent'),
      customer: z.string().describe('Customer identifier'),
      newsletter: z.string().describe('Newsletter opt-in status'),
      companyName: z.string().describe('Company name'),
      email: z.string().describe('Email address'),
      address: z.string().describe('Street address'),
      city: z.string().describe('City'),
      state: z.string().describe('State or province'),
      zip: z.string().describe('ZIP or postal code'),
      countryCode: z.string().describe('Country code'),
      phone: z.string().describe('Phone number'),
      question1: z.string().optional().describe('Custom capture question 1'),
      answer1: z.string().optional().describe('Custom capture answer 1'),
      question2: z.string().optional().describe('Custom capture question 2'),
      answer2: z.string().optional().describe('Custom capture answer 2'),
      question3: z.string().optional().describe('Custom capture question 3'),
      answer3: z.string().optional().describe('Custom capture answer 3'),
      question4: z.string().optional().describe('Custom capture question 4'),
      answer4: z.string().optional().describe('Custom capture answer 4'),
      question5: z.string().optional().describe('Custom capture question 5'),
      answer5: z.string().optional().describe('Custom capture answer 5'),
      rawPayload: z.record(z.string(), z.any()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Unique transaction identifier'),
      operator: z.string().describe('Operator name'),
      locationId: z.string().describe('Location ID'),
      userName: z.string().describe('Username'),
      actionDateGmt: z.string().describe('Transaction timestamp in GMT'),
      packageId: z.string().describe('Package ID'),
      userAgent: z.string().describe('Device user agent'),
      customer: z.string().describe('Customer identifier'),
      newsletter: z.string().describe('Newsletter opt-in status'),
      companyName: z.string().describe('Company name'),
      email: z.string().describe('Email address'),
      address: z.string().describe('Street address'),
      city: z.string().describe('City'),
      state: z.string().describe('State or province'),
      zip: z.string().describe('ZIP or postal code'),
      countryCode: z.string().describe('Country code'),
      phone: z.string().describe('Phone number'),
      question1: z.string().optional().describe('Custom capture question 1'),
      answer1: z.string().optional().describe('Custom capture answer 1'),
      question2: z.string().optional().describe('Custom capture question 2'),
      answer2: z.string().optional().describe('Custom capture answer 2'),
      question3: z.string().optional().describe('Custom capture question 3'),
      answer3: z.string().optional().describe('Custom capture answer 3'),
      question4: z.string().optional().describe('Custom capture question 4'),
      answer4: z.string().optional().describe('Custom capture answer 4'),
      question5: z.string().optional().describe('Custom capture question 5'),
      answer5: z.string().optional().describe('Custom capture answer 5')
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
        actionDateGmt: data.action_date_gmt ?? '',
        packageId: data.package_id ?? '',
        userAgent: data.user_agent ?? '',
        customer: data.customer ?? '',
        newsletter: data.newsletter ?? '',
        companyName: data.company_name ?? '',
        email: data.email ?? '',
        address: data.address ?? '',
        city: data.city ?? '',
        state: data.state ?? '',
        zip: data.zip ?? '',
        countryCode: data.country_code ?? '',
        phone: data.phone ?? '',
        question1: data.q1 || undefined,
        answer1: data.a1 || undefined,
        question2: data.q2 || undefined,
        answer2: data.a2 || undefined,
        question3: data.q3 || undefined,
        answer3: data.a3 || undefined,
        question4: data.q4 || undefined,
        answer4: data.a4 || undefined,
        question5: data.q5 || undefined,
        answer5: data.a5 || undefined,
        rawPayload: data
      };

      return {
        inputs: [input]
      };
    },

    handleEvent: async ctx => {
      let { rawPayload, ...transactionData } = ctx.input;

      return {
        type: 'transaction.mac.created',
        id: ctx.input.transactionId || `mac-tx-${Date.now()}`,
        output: transactionData
      };
    }
  })
  .build();

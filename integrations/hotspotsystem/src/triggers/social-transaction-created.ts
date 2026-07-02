import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let socialTransactionCreated = SlateTrigger.create(spec, {
  name: 'Social Transaction Created',
  key: 'social_transaction_created',
  description:
    'Triggered when a new social login access transaction is recorded. Configure the webhook in the HotspotSystem Control Center under Tools & Settings > Webhooks with the event type "transaction.social.create".'
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
      socialId: z.string().describe('Social network user ID'),
      socialUsername: z.string().describe('Social network username'),
      socialLink: z.string().describe('Social profile URL'),
      socialGender: z.string().describe('Gender from social profile'),
      socialAgeRange: z.string().describe('Age range from social profile'),
      socialFollowersCount: z.string().describe('Followers count from social profile'),
      socialNetwork: z.string().describe('Social network name'),
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
      socialId: z.string().describe('Social network user ID'),
      socialUsername: z.string().describe('Social network username'),
      socialLink: z.string().describe('Social profile URL'),
      socialGender: z.string().describe('Gender from social profile'),
      socialAgeRange: z.string().describe('Age range from social profile'),
      socialFollowersCount: z.string().describe('Followers count from social profile'),
      socialNetwork: z.string().describe('Social network name')
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
        socialId: data.social_id ?? '',
        socialUsername: data.social_username ?? '',
        socialLink: data.social_link ?? '',
        socialGender: data.social_gender ?? '',
        socialAgeRange: data.social_age_range ?? '',
        socialFollowersCount: data.social_followers_count ?? '',
        socialNetwork: data.social_network ?? '',
        rawPayload: data
      };

      return {
        inputs: [input]
      };
    },

    handleEvent: async ctx => {
      let { rawPayload, ...transactionData } = ctx.input;

      return {
        type: 'transaction.social.created',
        id: ctx.input.transactionId || `social-tx-${Date.now()}`,
        output: transactionData
      };
    }
  })
  .build();

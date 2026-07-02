import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let subscriberCreated = SlateTrigger.create(spec, {
  name: 'Subscriber Created',
  key: 'subscriber_created',
  description:
    'Triggered when a new client subscribes to the newsletter at a hotspot location. Configure the webhook in the HotspotSystem Control Center under Tools & Settings > Webhooks with the event type "subscriber.create".'
})
  .input(
    z.object({
      subscriberId: z.string().describe('Unique subscriber identifier'),
      userName: z.string().describe('Subscriber username'),
      name: z.string().describe('Full name'),
      email: z.string().describe('Email address'),
      companyName: z.string().describe('Company name'),
      address: z.string().describe('Street address'),
      city: z.string().describe('City'),
      state: z.string().describe('State or province'),
      zip: z.string().describe('ZIP or postal code'),
      countryCode: z.string().describe('Country code'),
      phone: z.string().describe('Phone number'),
      socialNetwork: z.string().describe('Social network used for registration'),
      socialId: z.string().describe('Social network user ID'),
      socialUsername: z.string().describe('Social network username'),
      socialLink: z.string().describe('Social profile URL'),
      socialGender: z.string().describe('Gender from social profile'),
      socialAgeRange: z.string().describe('Age range from social profile'),
      socialFollowersCount: z.string().describe('Followers count from social profile'),
      registeredAt: z.string().describe('Registration timestamp'),
      rawPayload: z.record(z.string(), z.any()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      subscriberId: z.string().describe('Unique subscriber identifier'),
      userName: z.string().describe('Subscriber username'),
      name: z.string().describe('Full name'),
      email: z.string().describe('Email address'),
      companyName: z.string().describe('Company name'),
      address: z.string().describe('Street address'),
      city: z.string().describe('City'),
      state: z.string().describe('State or province'),
      zip: z.string().describe('ZIP or postal code'),
      countryCode: z.string().describe('Country code'),
      phone: z.string().describe('Phone number'),
      socialNetwork: z.string().describe('Social network used for registration'),
      socialId: z.string().describe('Social network user ID'),
      socialUsername: z.string().describe('Social network username'),
      socialLink: z.string().describe('Social profile URL'),
      socialGender: z.string().describe('Gender from social profile'),
      socialAgeRange: z.string().describe('Age range from social profile'),
      socialFollowersCount: z.string().describe('Followers count from social profile'),
      registeredAt: z.string().describe('Registration timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let input = {
        subscriberId: String(data.id ?? ''),
        userName: data.user_name ?? '',
        name: data.name ?? '',
        email: data.email ?? '',
        companyName: data.company_name ?? '',
        address: data.address ?? '',
        city: data.city ?? '',
        state: data.state ?? '',
        zip: data.zip ?? '',
        countryCode: data.country_code ?? '',
        phone: data.phone ?? '',
        socialNetwork: data.social_network ?? '',
        socialId: data.social_id ?? '',
        socialUsername: data.social_username ?? '',
        socialLink: data.social_link ?? '',
        socialGender: data.social_gender ?? '',
        socialAgeRange: data.social_age_range ?? '',
        socialFollowersCount: data.social_followers_count ?? '',
        registeredAt: data.registered_at ?? '',
        rawPayload: data
      };

      return {
        inputs: [input]
      };
    },

    handleEvent: async ctx => {
      let { rawPayload, ...subscriberData } = ctx.input;

      return {
        type: 'subscriber.created',
        id: ctx.input.subscriberId || `subscriber-${Date.now()}`,
        output: subscriberData
      };
    }
  })
  .build();

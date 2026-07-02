import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let subscriberSchema = z.object({
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
});

export let listSubscribers = SlateTool.create(spec, {
  name: 'List Subscribers',
  key: 'list_subscribers',
  description: `Retrieve newsletter subscribers from your hotspot locations. Subscribers are customers who opted into the newsletter. Includes the same contact and social login details as customer records. Can be filtered by location.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      locationId: z
        .string()
        .optional()
        .describe(
          'Filter subscribers by a specific location ID. Omit to retrieve across all locations.'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of subscribers to return per page'),
      offset: z.number().optional().describe('Zero-based page offset for pagination'),
      sort: z
        .string()
        .optional()
        .describe('Property to sort by; prefix with - for descending order')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of subscribers matching the query'),
      subscribers: z.array(subscriberSchema).describe('List of subscriber records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getSubscribers({
      locationId: ctx.input.locationId,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort
    });

    let subscribers = (result.items ?? []).map(s => ({
      subscriberId: String(s.id),
      userName: s.user_name ?? '',
      name: s.name ?? '',
      email: s.email ?? '',
      companyName: s.company_name ?? '',
      address: s.address ?? '',
      city: s.city ?? '',
      state: s.state ?? '',
      zip: s.zip ?? '',
      countryCode: s.country_code ?? '',
      phone: s.phone ?? '',
      socialNetwork: s.social_network ?? '',
      socialId: s.social_id ?? '',
      socialUsername: s.social_username ?? '',
      socialLink: s.social_link ?? '',
      socialGender: s.social_gender ?? '',
      socialAgeRange: s.social_age_range ?? '',
      socialFollowersCount: s.social_followers_count ?? '',
      registeredAt: s.registered_at ?? ''
    }));

    let locationLabel = ctx.input.locationId
      ? ` for location ${ctx.input.locationId}`
      : ' across all locations';
    return {
      output: {
        totalCount: result.metadata.total_count,
        subscribers
      },
      message: `Retrieved ${subscribers.length} subscribers${locationLabel} (${result.metadata.total_count} total).`
    };
  })
  .build();

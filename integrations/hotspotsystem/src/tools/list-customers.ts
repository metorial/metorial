import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let customerSchema = z.object({
  customerId: z.string().describe('Unique customer identifier'),
  userName: z.string().describe('Customer username'),
  name: z.string().describe('Full name'),
  email: z.string().describe('Email address'),
  companyName: z.string().describe('Company name'),
  address: z.string().describe('Street address'),
  city: z.string().describe('City'),
  state: z.string().describe('State or province'),
  zip: z.string().describe('ZIP or postal code'),
  countryCode: z.string().describe('Country code'),
  phone: z.string().describe('Phone number'),
  socialNetwork: z
    .string()
    .describe('Social network used for registration (e.g. Facebook, Instagram)'),
  socialId: z.string().describe('Social network user ID'),
  socialUsername: z.string().describe('Social network username'),
  socialLink: z.string().describe('Social profile URL'),
  socialGender: z.string().describe('Gender from social profile'),
  socialAgeRange: z.string().describe('Age range from social profile'),
  socialFollowersCount: z.string().describe('Followers count from social profile'),
  registeredAt: z.string().describe('Registration timestamp')
});

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Retrieve customer records from your hotspot locations. Customers include contact details and social login attributes when they registered via a social network. Can be filtered by a specific location or retrieved across all locations.`,
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
          'Filter customers by a specific location ID. Omit to retrieve across all locations.'
        ),
      limit: z.number().optional().describe('Maximum number of customers to return per page'),
      offset: z.number().optional().describe('Zero-based page offset for pagination'),
      sort: z
        .string()
        .optional()
        .describe('Property to sort by; prefix with - for descending order')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of customers matching the query'),
      customers: z.array(customerSchema).describe('List of customer records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCustomers({
      locationId: ctx.input.locationId,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort
    });

    let customers = (result.items ?? []).map(c => ({
      customerId: String(c.id),
      userName: c.user_name ?? '',
      name: c.name ?? '',
      email: c.email ?? '',
      companyName: c.company_name ?? '',
      address: c.address ?? '',
      city: c.city ?? '',
      state: c.state ?? '',
      zip: c.zip ?? '',
      countryCode: c.country_code ?? '',
      phone: c.phone ?? '',
      socialNetwork: c.social_network ?? '',
      socialId: c.social_id ?? '',
      socialUsername: c.social_username ?? '',
      socialLink: c.social_link ?? '',
      socialGender: c.social_gender ?? '',
      socialAgeRange: c.social_age_range ?? '',
      socialFollowersCount: c.social_followers_count ?? '',
      registeredAt: c.registered_at ?? ''
    }));

    let locationLabel = ctx.input.locationId
      ? ` for location ${ctx.input.locationId}`
      : ' across all locations';
    return {
      output: {
        totalCount: result.metadata.total_count,
        customers
      },
      message: `Retrieved ${customers.length} customers${locationLabel} (${result.metadata.total_count} total).`
    };
  })
  .build();

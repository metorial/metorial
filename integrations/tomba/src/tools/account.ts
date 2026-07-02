import { SlateTool } from 'slates';
import { z } from 'zod';
import { TombaClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve your Tomba account information including profile details, subscription plan, and API usage statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().nullable().optional().describe('User ID'),
      firstName: z.string().nullable().optional().describe('First name'),
      lastName: z.string().nullable().optional().describe('Last name'),
      email: z.string().nullable().optional().describe('Account email'),
      phone: z.string().nullable().optional().describe('Phone number'),
      image: z.string().nullable().optional().describe('Profile image URL'),
      country: z.string().nullable().optional().describe('Country'),
      timezone: z.string().nullable().optional().describe('Timezone'),
      createdAt: z.string().nullable().optional().describe('Account creation date'),
      pricing: z.any().nullable().optional().describe('Subscription plan details'),
      requests: z.any().nullable().optional().describe('API request quotas and usage')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.getAccount();
    let data = result.data || result;

    return {
      output: {
        userId: data.user_id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        image: data.image,
        country: data.country,
        timezone: data.timezone,
        createdAt: data.created_at,
        pricing: data.pricing,
        requests: data.requests
      },
      message: `Account: **${data.first_name} ${data.last_name}** (${data.email}).`
    };
  })
  .build();

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage',
  key: 'get_usage',
  description: `Retrieve API usage statistics and consumption data. Track how many API calls have been made against your limits.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      usage: z.any().describe('Usage data including API call counts and limits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.getUsage();

    return {
      output: {
        usage: result.data || result
      },
      message: `Retrieved API usage statistics.`
    };
  })
  .build();

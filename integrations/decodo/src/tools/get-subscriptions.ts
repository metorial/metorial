import { SlateTool } from 'slates';
import { z } from 'zod';
import { PublicApiClient } from '../lib/public-api-client';
import { spec } from '../spec';

export let getSubscriptions = SlateTool.create(spec, {
  name: 'Get Subscriptions',
  key: 'get_subscriptions',
  description: `Retrieve current subscription details including traffic limits, validity period, user limits, and service type. Useful for checking account status and remaining capacity.`,
  constraints: ['Requires API Key authentication (Public API).'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      subscriptions: z
        .array(
          z.object({
            trafficLimit: z.number().optional().describe('Total traffic limit in GB'),
            trafficPerPeriod: z
              .number()
              .optional()
              .describe('Traffic allocated per billing period in GB'),
            usersLimit: z.number().optional().describe('Maximum number of sub-users'),
            ipAddressLimit: z
              .number()
              .optional()
              .describe('Maximum number of whitelisted IPs'),
            validFrom: z.string().optional().describe('Subscription start date'),
            validUntil: z.string().optional().describe('Subscription end date'),
            serviceType: z
              .string()
              .optional()
              .describe('Service type (e.g. residential_proxies, datacenter_proxies)')
          })
        )
        .describe('List of active subscriptions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PublicApiClient(ctx.auth.token);
    let subscriptions = await client.getSubscriptions();

    let summary = subscriptions
      .map(
        s =>
          `${s.serviceType || 'unknown'}: ${s.trafficLimit || 'unlimited'} GB limit, valid until ${s.validUntil || 'N/A'}`
      )
      .join('\n');

    return {
      output: { subscriptions },
      message: `Found **${subscriptions.length}** subscription(s):\n${summary}`
    };
  })
  .build();

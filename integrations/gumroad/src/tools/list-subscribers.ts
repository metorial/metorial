import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';

let subscriberSchema = z.object({
  subscriberId: z.string().describe('Unique subscriber ID'),
  productId: z.string().optional().describe('Product ID'),
  productName: z.string().optional().describe('Product name'),
  userId: z.string().optional().describe('Gumroad user ID of the subscriber'),
  email: z.string().optional().describe('Subscriber email address'),
  status: z.string().optional().describe('Subscription status'),
  createdAt: z.string().optional().describe('Subscription creation timestamp'),
  endedAt: z.string().optional().describe('Subscription end timestamp'),
  licenseKey: z.string().optional().describe('License key')
});

export let listSubscribers = SlateTool.create(spec, {
  name: 'List Subscribers',
  key: 'list_subscribers',
  description: `Retrieve active subscribers for a specific Gumroad product. Optionally filter by email address and use cursor-based pagination.`,
  instructions: ['Use pageKey from a previous paginated response to get the next page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().describe('The product ID to list subscribers for'),
      email: z.string().optional().describe('Filter subscribers by email address'),
      paginated: z
        .boolean()
        .optional()
        .describe('Whether to return paginated results. Defaults to Gumroad API behavior.'),
      pageKey: z.string().optional().describe('Pagination cursor from previous response')
    })
  )
  .output(
    z.object({
      subscribers: z.array(subscriberSchema).describe('List of subscribers'),
      nextPageKey: z.string().optional().describe('Cursor for next page of results'),
      nextPageUrl: z.string().optional().describe('URL for next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let result = await client.listSubscribers(ctx.input.productId, {
      email: ctx.input.email,
      paginated: ctx.input.paginated,
      pageKey: ctx.input.pageKey
    });

    let mapped = result.subscribers.map((s: any) => ({
      subscriberId: s.id,
      productId: s.product_id || undefined,
      productName: s.product_name || undefined,
      userId: s.user_id || undefined,
      email: s.email || undefined,
      status: s.status || undefined,
      createdAt: s.created_at || undefined,
      endedAt: s.ended_at || undefined,
      licenseKey: s.license_key || undefined
    }));

    return {
      output: {
        subscribers: mapped,
        nextPageKey: result.nextPageKey,
        nextPageUrl: result.nextPageUrl
      },
      message: `Found **${mapped.length}** subscriber(s) for product ${ctx.input.productId}.${result.nextPageKey ? ' More results available with pagination.' : ''}`
    };
  })
  .build();

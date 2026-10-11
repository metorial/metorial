import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { gumroadActionScopes } from '../lib/scopes';
import { spec } from '../spec';
import { mapSubscriber, subscriberSchema } from './subscriber-utils';

export let listSubscribers = SlateTool.create(spec, {
  name: 'List Subscribers',
  key: 'list_subscribers',
  description: `Retrieve active subscribers for a specific Gumroad product. Optionally filter by email address and use cursor-based pagination.`,
  instructions: ['Use pageKey from a previous paginated response to get the next page.'],
  tags: {
    readOnly: true
  }
})
  .scopes(gumroadActionScopes.viewSales)
  .input(
    z.object({
      productId: z.string().describe('The product ID to list subscribers for'),
      email: z.string().optional().describe('Filter subscribers by email address'),
      paginated: z
        .boolean()
        .optional()
        .describe(
          'Set true to return at most 100 subscribers per page with a nextPageKey. Defaults to false, which returns all active subscribers.'
        ),
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

    let mapped = result.subscribers.map(mapSubscriber);

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

import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendloopClient } from '../lib/client';
import { spec } from '../spec';

export let searchSubscribers = SlateTool.create(spec, {
  name: 'Search Subscribers',
  key: 'search_subscribers',
  description: `Search for subscribers by email address across all lists, or browse subscribers within a specific list. Use this to find subscriber details, look up profiles, or list members of a given list with optional segment filtering and pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      emailAddress: z
        .string()
        .optional()
        .describe('Email address to search for (exact or partial match across all lists)'),
      listId: z
        .string()
        .optional()
        .describe(
          'List ID to browse subscribers in (use with segmentId and startIndex for filtering/pagination)'
        ),
      segmentId: z
        .string()
        .optional()
        .describe('Segment ID to filter subscribers within the list'),
      startIndex: z
        .number()
        .optional()
        .describe('Pagination start index (returns 100 subscribers per call)')
    })
  )
  .output(
    z.object({
      subscribers: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of subscriber records found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendloopClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    if (ctx.input.emailAddress && !ctx.input.listId) {
      let result = await client.searchSubscribers(ctx.input.emailAddress);
      let subscribers = result.Subscribers || result.Data || [];
      if (!Array.isArray(subscribers)) subscribers = [subscribers];

      return {
        output: { subscribers },
        message: `Found **${subscribers.length}** subscriber(s) matching **${ctx.input.emailAddress}**.`
      };
    }

    if (ctx.input.listId) {
      if (ctx.input.emailAddress) {
        let result = await client.getSubscriber(ctx.input.listId, {
          emailAddress: ctx.input.emailAddress
        });
        let subscriber = result.Subscriber || result;
        return {
          output: { subscribers: subscriber ? [subscriber] : [] },
          message: subscriber
            ? `Found subscriber **${ctx.input.emailAddress}** in list **${ctx.input.listId}**.`
            : `No subscriber found for **${ctx.input.emailAddress}** in list **${ctx.input.listId}**.`
        };
      }

      let result = await client.browseSubscribers(ctx.input.listId, {
        segmentId: ctx.input.segmentId,
        startIndex:
          ctx.input.startIndex !== undefined ? String(ctx.input.startIndex) : undefined
      });
      let subscribers = result.Subscribers || result.Data || [];
      if (!Array.isArray(subscribers)) subscribers = [subscribers];

      return {
        output: { subscribers },
        message: `Retrieved **${subscribers.length}** subscriber(s) from list **${ctx.input.listId}**.`
      };
    }

    throw new Error('Either emailAddress or listId must be provided');
  })
  .build();

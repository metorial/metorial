import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { mapSubscriber, optionalNumber, record, records } from '../lib/data';
import { spec } from '../spec';

export let listSubscribers = SlateTool.create(spec, {
  name: 'List Subscribers',
  key: 'list_subscribers',
  description: `Retrieve subscribers from a mailing list filtered by their subscription status. Supports pagination; compare returned timestamps after paging when needed.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mailingListId: z.string().describe('ID of the mailing list'),
      status: z
        .enum(['Subscribed', 'Unsubscribed', 'Bounced', 'Removed'])
        .describe('Filter subscribers by status'),
      page: z.number().optional().default(1).describe('Page number (starts at 1)'),
      pageSize: z.number().optional().default(100).describe('Number of subscribers per page'),
      since: z
        .string()
        .optional()
        .describe(
          'Legacy field; current API does not document this filter, so supplied values receive explicit validation'
        )
    })
  )
  .output(
    z.object({
      subscribers: z
        .array(
          z.object({
            subscriberId: z.string().describe('Subscriber ID'),
            email: z.string().describe('Subscriber email'),
            name: z.string().optional().describe('Subscriber name'),
            createdOn: z.string().optional().describe('Subscription date'),
            updatedOn: z.string().optional().describe('Last update date')
          })
        )
        .describe('List of subscribers matching the status filter'),
      totalCount: z.number().optional().describe('Total matching subscribers'),
      currentPage: z.number().describe('Current page number'),
      returnedCount: z.number().optional().describe('Number of subscribers in this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoosendClient({ token: ctx.auth.token });

    let result = await client.getSubscribersByStatus(
      ctx.input.mailingListId,
      ctx.input.status,
      ctx.input.page,
      ctx.input.pageSize,
      ctx.input.since
    );

    let subscribersList = records(result.Subscribers, 'subscribers');
    let paging = result.Paging == null ? undefined : record(result.Paging, 'paging');

    let subscribers = subscribersList.map(mapSubscriber);

    return {
      output: {
        subscribers,
        totalCount: optionalNumber(paging?.TotalResults),
        currentPage: ctx.input.page,
        returnedCount: subscribers.length
      },
      message: `Retrieved **${subscribers.length}** ${ctx.input.status.toLowerCase()} subscriber(s) from list ${ctx.input.mailingListId}.`
    };
  })
  .build();

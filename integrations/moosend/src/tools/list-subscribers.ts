import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { spec } from '../spec';

export let listSubscribers = SlateTool.create(spec, {
  name: 'List Subscribers',
  key: 'list_subscribers',
  description: `Retrieve subscribers from a mailing list filtered by their subscription status. Supports pagination and date filtering.`,
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
        .describe('Only return subscribers added/changed since this date (e.g. "2024-01-01")')
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
      currentPage: z.number().describe('Current page number')
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

    let subscribersList = (result?.Subscribers as Record<string, unknown>[]) ?? [];
    let paging = result?.Paging as Record<string, unknown> | undefined;

    let subscribers = subscribersList.map(s => ({
      subscriberId: String(s?.ID ?? ''),
      email: String(s?.Email ?? ''),
      name: s?.Name ? String(s.Name) : undefined,
      createdOn: s?.CreatedOn ? String(s.CreatedOn) : undefined,
      updatedOn: s?.UpdatedOn ? String(s.UpdatedOn) : undefined
    }));

    return {
      output: {
        subscribers,
        totalCount: paging?.TotalResults as number | undefined,
        currentPage: ctx.input.page
      },
      message: `Retrieved **${subscribers.length}** ${ctx.input.status.toLowerCase()} subscriber(s) from list ${ctx.input.mailingListId}.`
    };
  })
  .build();

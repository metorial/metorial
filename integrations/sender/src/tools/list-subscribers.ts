import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, subscriberDetails } from '../lib/client';
import { spec } from '../spec';

export let listSubscribers = SlateTool.create(spec, {
  name: 'List Subscribers',
  key: 'list_subscribers',
  description: `Retrieves a paginated list of all subscribers in your Sender account. Optionally filter by a specific group to see only its members. Returns subscriber details including email, name, status, and group memberships.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number for pagination'),
      groupId: z
        .string()
        .optional()
        .describe(
          'Filter subscribers by group ID. If provided, only subscribers in this group are returned.'
        )
    })
  )
  .output(
    z.object({
      subscribers: z
        .array(
          z.object({
            subscriberId: z
              .number()
              .optional()
              .describe('Legacy numeric subscriber ID, when returned by Sender'),
            subscriberKey: z
              .string()
              .describe(
                'Subscriber ID. Pass this value to get_subscriber or update_subscriber as identifier'
              ),
            email: z.string().describe('Email address'),
            firstname: z.string().nullable().describe('First name'),
            lastname: z.string().nullable().describe('Last name'),
            subscriberStatus: z.string().describe('Subscription status'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of subscribers'),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Total number of pages'),
      total: z.number().describe('Total number of subscribers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = ctx.input.groupId
      ? await client.listGroupSubscribers(ctx.input.groupId, ctx.input.page)
      : await client.listSubscribers(ctx.input.page);

    return {
      output: {
        subscribers: result.data.map(subscriberDetails),
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page,
        total: result.meta.total
      },
      message: `Found **${result.meta.total}** subscriber(s) (page ${result.meta.current_page}/${result.meta.last_page}).`
    };
  })
  .build();

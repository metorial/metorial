import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let subscriberSchema = z.object({
  subscriberUuid: z.string().describe('Unique identifier of the subscriber'),
  emailListUuid: z.string().describe('UUID of the email list the subscriber belongs to'),
  email: z.string().describe('Email address of the subscriber'),
  firstName: z.string().nullable().describe('First name'),
  lastName: z.string().nullable().describe('Last name'),
  status: z.string().describe('Subscription status (subscribed, unconfirmed, unsubscribed)'),
  tags: z.array(z.string()).describe('Tags assigned to the subscriber'),
  extraAttributes: z
    .record(z.string(), z.unknown())
    .nullable()
    .describe('Custom extra attributes'),
  subscribedAt: z.string().nullable().describe('Subscription timestamp'),
  unsubscribedAt: z.string().nullable().describe('Unsubscription timestamp'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listSubscribers = SlateTool.create(spec, {
  name: 'List Subscribers',
  key: 'list_subscribers',
  description: `Retrieve subscribers from an email list. Supports searching by email, name, or tags, and filtering by subscription status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      emailListUuid: z
        .string()
        .describe('UUID of the email list to retrieve subscribers from'),
      search: z
        .string()
        .optional()
        .describe('Search term to filter by email, first name, last name, or tags'),
      status: z
        .enum(['subscribed', 'unconfirmed', 'unsubscribed'])
        .optional()
        .describe('Filter by subscription status'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      subscribers: z.array(subscriberSchema).describe('List of subscribers'),
      totalCount: z.number().describe('Total number of subscribers matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.listSubscribers(ctx.input.emailListUuid, {
      search: ctx.input.search,
      status: ctx.input.status,
      page: ctx.input.page
    });

    let subscribers = (result.data || []).map((sub: any) => ({
      subscriberUuid: sub.uuid,
      emailListUuid: sub.email_list_uuid,
      email: sub.email,
      firstName: sub.first_name ?? null,
      lastName: sub.last_name ?? null,
      status: sub.status ?? 'subscribed',
      tags: sub.tags ?? [],
      extraAttributes: sub.extra_attributes ?? null,
      subscribedAt: sub.subscribed_at ?? null,
      unsubscribedAt: sub.unsubscribed_at ?? null,
      createdAt: sub.created_at,
      updatedAt: sub.updated_at
    }));

    return {
      output: {
        subscribers,
        totalCount: result.meta?.total ?? subscribers.length
      },
      message: `Found **${subscribers.length}** subscriber(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  });

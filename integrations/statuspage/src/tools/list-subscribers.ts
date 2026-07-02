import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubscribers = SlateTool.create(spec, {
  name: 'List Subscribers',
  key: 'list_subscribers',
  description: `List subscribers on the status page with optional filtering by type and state. Returns subscriber contact information and subscription scope.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['email', 'sms', 'webhook', 'slack', 'teams', 'integration_partner'])
        .optional()
        .describe('Filter by subscriber type'),
      state: z
        .enum(['active', 'unconfirmed', 'quarantined'])
        .optional()
        .describe('Filter by subscriber state'),
      limit: z.number().optional().describe('Maximum number of subscribers per page'),
      page: z.number().optional().describe('Page number for pagination'),
      sortField: z.string().optional().describe('Field to sort by, e.g. "created_at"'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      subscribers: z
        .array(
          z.object({
            subscriberId: z.string().describe('Unique identifier of the subscriber'),
            type: z.string().describe('Subscriber type'),
            emailAddress: z.string().optional().nullable().describe('Email address'),
            phoneNumber: z.string().optional().nullable().describe('Phone number'),
            webhookEndpoint: z.string().optional().nullable().describe('Webhook endpoint URL'),
            mode: z.string().optional().describe('Subscription mode'),
            state: z.string().optional().describe('Current state of the subscriber'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of subscribers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, pageId: ctx.config.pageId });

    let raw = await client.listSubscribers({
      type: ctx.input.type,
      state: ctx.input.state,
      limit: ctx.input.limit,
      page: ctx.input.page,
      sortField: ctx.input.sortField,
      sortDirection: ctx.input.sortDirection
    });

    let subscribers = raw.map((s: any) => ({
      subscriberId: s.id,
      type: s.type,
      emailAddress: s.email,
      phoneNumber: s.phone_number,
      webhookEndpoint: s.endpoint,
      mode: s.mode,
      state: s.state,
      createdAt: s.created_at
    }));

    return {
      output: { subscribers },
      message: `Found **${subscribers.length}** subscriber(s).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSubscriber = SlateTool.create(spec, {
  name: 'Get Subscriber',
  key: 'get_subscriber',
  description: `Fetches detailed information about a single subscriber by their ID or email address. Returns subscriber profile data including custom fields and group memberships.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      subscriberIdOrEmail: z.string().describe('Subscriber ID or email address to look up')
    })
  )
  .output(
    z.object({
      subscriberId: z.string().describe('Unique subscriber ID'),
      email: z.string().describe('Email address'),
      status: z.string().describe('Subscriber status'),
      fields: z.record(z.string(), z.any()).optional().describe('Custom field values'),
      groups: z.array(z.any()).optional().describe('Groups the subscriber belongs to'),
      subscribedAt: z.string().optional().describe('Subscription timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      openedCount: z.number().optional().describe('Number of emails opened'),
      clickedCount: z.number().optional().describe('Number of links clicked')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getSubscriber(ctx.input.subscriberIdOrEmail);
    let s = result.data;

    return {
      output: {
        subscriberId: s.id,
        email: s.email,
        status: s.status,
        fields: s.fields,
        groups: s.groups,
        subscribedAt: s.subscribed_at,
        createdAt: s.created_at,
        openedCount: s.opens_count,
        clickedCount: s.clicks_count
      },
      message: `Found subscriber **${s.email}** (status: **${s.status}**).`
    };
  })
  .build();

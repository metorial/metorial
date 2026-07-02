import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrUpdateSubscriber = SlateTool.create(spec, {
  name: 'Create or Update Subscriber',
  key: 'create_or_update_subscriber',
  description: `Creates a new subscriber or updates an existing one by email address. This is a non-destructive upsert operation — omitting fields or groups will not remove them from an existing subscriber. Can assign subscribers to groups and set custom field values.

**Note:** If a subscriber's status is unsubscribed, bounced, or junk, you cannot reactivate them via the API.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the subscriber'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Custom field values as key-value pairs (e.g., { "name": "John", "company": "Acme" })'
        ),
      groupIds: z
        .array(z.string())
        .optional()
        .describe('Group IDs to assign the subscriber to'),
      status: z
        .enum(['active', 'unsubscribed', 'unconfirmed', 'bounced', 'junk'])
        .optional()
        .describe('Subscriber status'),
      subscribedAt: z
        .string()
        .optional()
        .describe('Date when the subscriber was added (ISO 8601 format)'),
      ipAddress: z.string().optional().describe('IP address of the subscriber'),
      optedInAt: z
        .string()
        .optional()
        .describe('Date when the subscriber opted in (ISO 8601 format)'),
      optinIp: z.string().optional().describe('IP address used when opting in')
    })
  )
  .output(
    z.object({
      subscriberId: z.string().describe('Unique ID of the subscriber'),
      email: z.string().describe('Email address'),
      status: z.string().describe('Current subscriber status'),
      fields: z.record(z.string(), z.any()).optional().describe('Custom field values'),
      groups: z.array(z.any()).optional().describe('Groups the subscriber belongs to'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createOrUpdateSubscriber({
      email: ctx.input.email,
      fields: ctx.input.fields,
      groups: ctx.input.groupIds,
      status: ctx.input.status,
      subscribed_at: ctx.input.subscribedAt,
      ip_address: ctx.input.ipAddress,
      opted_in_at: ctx.input.optedInAt,
      optin_ip: ctx.input.optinIp
    });

    let subscriber = result.data;

    return {
      output: {
        subscriberId: subscriber.id,
        email: subscriber.email,
        status: subscriber.status,
        fields: subscriber.fields,
        groups: subscriber.groups,
        createdAt: subscriber.created_at
      },
      message: `Subscriber **${subscriber.email}** has been created/updated with status **${subscriber.status}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSubscriber = SlateTool.create(spec, {
  name: 'Manage Subscriber',
  key: 'manage_subscriber',
  description: `Create, update, get, or unsubscribe a subscriber. Use this to add new subscribers, update existing subscriber info (name, email, custom fields), look up subscriber details by ID, or unsubscribe a subscriber.`,
  instructions: [
    'To create a new subscriber, set action to "create" and provide emailAddress.',
    'To update, set action to "update" and provide subscriberId plus the fields to change.',
    'To unsubscribe, set action to "unsubscribe" and provide subscriberId.',
    'To look up a subscriber, set action to "get" and provide subscriberId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'unsubscribe'])
        .describe('Action to perform on the subscriber'),
      subscriberId: z
        .number()
        .optional()
        .describe('Subscriber ID (required for update, get, unsubscribe)'),
      emailAddress: z
        .string()
        .optional()
        .describe('Email address (required for create, optional for update)'),
      firstName: z.string().optional().describe('First name'),
      state: z
        .enum(['active', 'inactive'])
        .optional()
        .describe('Initial state (only for create)'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values as key-value pairs')
    })
  )
  .output(
    z.object({
      subscriberId: z.number().optional().describe('Subscriber ID'),
      firstName: z.string().nullable().optional().describe('First name'),
      emailAddress: z.string().optional().describe('Email address'),
      state: z.string().optional().describe('Subscriber state'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      fields: z
        .record(z.string(), z.string().nullable())
        .optional()
        .describe('Custom field values'),
      unsubscribed: z.boolean().optional().describe('Whether the subscriber was unsubscribed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    if (input.action === 'unsubscribe') {
      if (!input.subscriberId) throw new Error('subscriberId is required for unsubscribe');
      await client.unsubscribeSubscriber(input.subscriberId);
      return {
        output: {
          subscriberId: input.subscriberId,
          unsubscribed: true
        },
        message: `Subscriber **#${input.subscriberId}** has been unsubscribed.`
      };
    }

    if (input.action === 'get') {
      if (!input.subscriberId) throw new Error('subscriberId is required for get');
      let sub = await client.getSubscriber(input.subscriberId);
      return {
        output: {
          subscriberId: sub.id,
          firstName: sub.first_name,
          emailAddress: sub.email_address,
          state: sub.state,
          createdAt: sub.created_at,
          fields: sub.fields
        },
        message: `Subscriber **${sub.email_address}** (${sub.state})`
      };
    }

    if (input.action === 'create') {
      if (!input.emailAddress) throw new Error('emailAddress is required for create');
      let sub = await client.createSubscriber({
        emailAddress: input.emailAddress,
        firstName: input.firstName,
        state: input.state,
        fields: input.customFields
      });
      return {
        output: {
          subscriberId: sub.id,
          firstName: sub.first_name,
          emailAddress: sub.email_address,
          state: sub.state,
          createdAt: sub.created_at,
          fields: sub.fields
        },
        message: `Created subscriber **${sub.email_address}** (#${sub.id})`
      };
    }

    if (input.action === 'update') {
      if (!input.subscriberId) throw new Error('subscriberId is required for update');
      let sub = await client.updateSubscriber(input.subscriberId, {
        emailAddress: input.emailAddress,
        firstName: input.firstName,
        fields: input.customFields
      });
      return {
        output: {
          subscriberId: sub.id,
          firstName: sub.first_name,
          emailAddress: sub.email_address,
          state: sub.state,
          createdAt: sub.created_at,
          fields: sub.fields
        },
        message: `Updated subscriber **${sub.email_address}** (#${sub.id})`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  });

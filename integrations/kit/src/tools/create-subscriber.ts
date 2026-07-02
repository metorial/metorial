import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSubscriber = SlateTool.create(spec, {
  name: 'Create Subscriber',
  key: 'create_subscriber',
  description: `Add a new subscriber to your Kit account. You can set their name, email, initial state, and custom field values. By default, Kit requires subscribers to double-opt-in.`,
  instructions: [
    'Set state to "active" to skip double opt-in confirmation (use with caution).'
  ]
})
  .input(
    z.object({
      emailAddress: z.string().describe('Email address for the new subscriber'),
      firstName: z.string().optional().describe('First name of the subscriber'),
      state: z
        .enum(['active', 'inactive'])
        .optional()
        .describe('Initial subscriber state. Defaults to inactive (pending confirmation)'),
      fields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values as key-value pairs')
    })
  )
  .output(
    z.object({
      subscriberId: z.number().describe('Unique subscriber ID'),
      emailAddress: z.string().describe('Subscriber email address'),
      firstName: z.string().nullable().describe('Subscriber first name'),
      state: z.string().describe('Subscriber state'),
      createdAt: z.string().describe('When the subscriber was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.createSubscriber({
      emailAddress: ctx.input.emailAddress,
      firstName: ctx.input.firstName,
      state: ctx.input.state,
      fields: ctx.input.fields
    });
    let s = data.subscriber;

    return {
      output: {
        subscriberId: s.id,
        emailAddress: s.email_address,
        firstName: s.first_name,
        state: s.state,
        createdAt: s.created_at
      },
      message: `Created subscriber **${s.email_address}** with state \`${s.state}\`.`
    };
  })
  .build();

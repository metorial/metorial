import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user (agent) in the account. Users can have admin or manager roles. Users without an email act as call operators only and don't count toward subscription limits.`,
  instructions: [
    'Phone number must be in E.164 format (e.g., +14155551234).',
    'Omit email to create a call-operator-only user.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Full name of the user'),
      phoneNumber: z.string().describe('Phone number in E.164 format'),
      email: z
        .string()
        .optional()
        .describe('Email address (omit for call-operator-only users)'),
      role: z.enum(['admin', 'manager']).optional().describe('User role (default: manager)')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('The ID of the newly created user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    let result = await client.createUser({
      name: ctx.input.name,
      phoneNumber: ctx.input.phoneNumber,
      email: ctx.input.email,
      role: ctx.input.role
    });

    return {
      output: { userId: result.userId },
      message: `Created user **${ctx.input.name}** (ID: ${result.userId}).`
    };
  })
  .build();

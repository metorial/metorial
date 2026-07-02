import { SlateTool } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { spec } from '../spec';

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new Duo Security user. Optionally send an enrollment email to the user so they can set up their MFA device.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      username: z.string().describe('Unique username for the new user'),
      email: z.string().optional().describe('Email address for the user'),
      realname: z.string().optional().describe('Full name of the user'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      status: z
        .enum(['active', 'bypass', 'disabled'])
        .optional()
        .describe('Initial user status (default: active)'),
      notes: z.string().optional().describe('Notes about the user'),
      sendEnrollment: z
        .boolean()
        .optional()
        .describe('Send an enrollment email to the user after creation (requires email)')
    })
  )
  .output(
    z.object({
      userId: z.string(),
      username: z.string(),
      email: z.string().optional(),
      status: z.string(),
      enrollmentSent: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname
    });

    let result = await client.createUser({
      username: ctx.input.username,
      email: ctx.input.email,
      realname: ctx.input.realname,
      firstname: ctx.input.firstname,
      lastname: ctx.input.lastname,
      status: ctx.input.status,
      notes: ctx.input.notes
    });

    let user = result.response;
    let enrollmentSent = false;

    if (ctx.input.sendEnrollment && ctx.input.email) {
      try {
        await client.enrollUser({
          username: ctx.input.username,
          email: ctx.input.email
        });
        enrollmentSent = true;
      } catch (_e) {
        ctx.warn('Failed to send enrollment email');
      }
    }

    return {
      output: {
        userId: user.user_id,
        username: user.username,
        email: user.email || undefined,
        status: user.status,
        enrollmentSent
      },
      message: `Created user **${user.username}**${enrollmentSent ? ' and sent enrollment email' : ''}.`
    };
  })
  .build();

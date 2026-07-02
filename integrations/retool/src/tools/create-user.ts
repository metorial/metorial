import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user in the Retool organization. Use this for programmatic user onboarding. The user will receive an invitation to set up their account.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address for the new user'),
      firstName: z.string().describe('First name of the new user'),
      lastName: z.string().describe('Last name of the new user'),
      active: z
        .boolean()
        .optional()
        .describe('Whether the user should be active immediately (defaults to true)'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata key-value pairs to attach to the user'),
      userType: z.string().optional().describe('User type classification')
    })
  )
  .output(
    z.object({
      userId: z.string(),
      email: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      active: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.createUser({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      active: ctx.input.active,
      metadata: ctx.input.metadata,
      userType: ctx.input.userType
    });

    let u = result.data;

    return {
      output: {
        userId: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        active: u.active
      },
      message: `Created user **${u.first_name} ${u.last_name}** (${u.email}) with ID \`${u.id}\`.`
    };
  })
  .build();

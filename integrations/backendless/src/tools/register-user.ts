import { SlateTool } from 'slates';
import { z } from 'zod';
import { BackendlessClient } from '../lib/client';
import { spec } from '../spec';

export let registerUser = SlateTool.create(spec, {
  name: 'Register User',
  key: 'register_user',
  description: `Registers a new user in the Backendless Users table. Requires at minimum the identity property (typically email) and a password. Additional custom user properties can be included.`,
  constraints: [
    'The identity property (usually email) and password are required.',
    'Registration does not automatically log the user in.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address for the new user (identity property)'),
      password: z.string().describe('Password for the new user'),
      name: z.string().optional().describe('Display name for the user'),
      additionalProperties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Any additional custom properties to set on the user')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The objectId assigned to the new user'),
      user: z.record(z.string(), z.unknown()).describe('The complete registered user object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BackendlessClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      region: ctx.config.region
    });

    let userData: Record<string, unknown> = {
      email: ctx.input.email,
      password: ctx.input.password
    };
    if (ctx.input.name) userData.name = ctx.input.name;
    if (ctx.input.additionalProperties) {
      Object.assign(userData, ctx.input.additionalProperties);
    }

    let user = await client.registerUser(userData);

    return {
      output: {
        userId: user.objectId as string,
        user
      },
      message: `Registered new user **${ctx.input.email}** with ID **${user.objectId}**.`
    };
  })
  .build();

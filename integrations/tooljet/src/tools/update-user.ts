import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update an existing user's details such as name, email, password, or status. Identify the user by UUID or email address.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      identifier: z
        .string()
        .describe('User UUID or email address to identify the user to update'),
      name: z.string().optional().describe('New name for the user'),
      email: z.string().optional().describe('New email address for the user'),
      password: z.string().optional().describe('New password for the user (5-100 characters)'),
      status: z.enum(['active', 'archived']).optional().describe('New status for the user')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let body: Record<string, string> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.email) body.email = ctx.input.email;
    if (ctx.input.password) body.password = ctx.input.password;
    if (ctx.input.status) body.status = ctx.input.status;

    await client.updateUser(ctx.input.identifier, body);

    let changes = Object.keys(body).join(', ');
    return {
      output: { success: true },
      message: `Updated user **${ctx.input.identifier}**: changed ${changes}.`
    };
  })
  .build();

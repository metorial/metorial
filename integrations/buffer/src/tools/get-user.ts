import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserTool = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve the authenticated Buffer user's account details with the actual account identifier, email, and available profile details. Plan and nullable fields are omitted when the provider does not return them.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Unique identifier for the user'),
      name: z.string().optional().describe('Name of the user'),
      email: z.string().describe('Email address of the user'),
      avatar: z.string().optional().describe('URL of the user avatar'),
      plan: z.string().optional().describe('Current Buffer plan'),
      timezone: z.string().optional().describe('User timezone setting'),
      createdAt: z.string().optional().describe('Account creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let user = await client.getUser();

    return {
      output: {
        userId: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        plan: user.plan,
        timezone: user.timezone,
        createdAt: user.createdAt
      },
      message: `Retrieved Buffer account **${user.id}** (${user.email}).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserTool = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve the authenticated Buffer user's account details including plan type, timezone, and profile information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Unique identifier for the user'),
      name: z.string().describe('Name of the user'),
      email: z.string().describe('Email address of the user'),
      avatar: z.string().describe('URL of the user avatar'),
      plan: z.string().describe('Current Buffer plan'),
      timezone: z.string().describe('User timezone setting'),
      createdAt: z.string().describe('Account creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
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
      message: `Retrieved user **${user.name}** (${user.email}) on the **${user.plan}** plan.`
    };
  })
  .build();

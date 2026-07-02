import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapUser } from '../lib/mappers';
import { spec } from '../spec';

export let getUserTool = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed information about a specific Greenhouse user by their ID. Returns user name, email, admin status, and account details.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      userId: z.string().describe('The Greenhouse user ID')
    })
  )
  .output(
    z.object({
      userId: z.string(),
      name: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      primaryEmail: z.string().nullable(),
      emails: z.array(z.string()),
      disabled: z.boolean(),
      siteAdmin: z.boolean(),
      createdAt: z.string().nullable(),
      updatedAt: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });
    let raw = await client.getUser(Number.parseInt(ctx.input.userId, 10));
    let user = mapUser(raw);

    return {
      output: user,
      message: `Retrieved user **${user.name}** (ID: ${user.userId}, email: ${user.primaryEmail ?? 'none'}).`
    };
  })
  .build();

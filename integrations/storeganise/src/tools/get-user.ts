import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserTool = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed information about a specific tenant/customer. Look up by user ID or email address. Optionally include related data such as rented units, stored items, billing details, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userIdOrEmail: z.string().describe('The user ID or email address'),
      include: z
        .string()
        .optional()
        .describe(
          'Comma-separated related data to include (e.g. "units,items,billing,customFields")'
        )
    })
  )
  .output(
    z.object({
      user: z.record(z.string(), z.any()).describe('User account details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let user = await client.getUser(ctx.input.userIdOrEmail, ctx.input.include);

    return {
      output: { user },
      message: `Retrieved user **${user.firstName || ''} ${user.lastName || ''}** (${user.email || user._id}).`
    };
  })
  .build();

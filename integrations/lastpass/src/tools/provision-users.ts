import { SlateTool } from 'slates';
import { z } from 'zod';
import { LastPassClient } from '../lib/client';
import { spec } from '../spec';

export let provisionUsers = SlateTool.create(spec, {
  name: 'Provision Users',
  key: 'provision_users',
  description: `Create new user accounts in LastPass Enterprise. Add one or more users by email, optionally assigning them to groups and setting a full name. Provisioned users receive an email with a temporary password or activation link.`,
  instructions: [
    'Each user requires at minimum a **username** (email address).',
    'Optionally provide **fullname** and **groups** for each user.'
  ],
  constraints: ['Provisioned users are sent an email notification automatically.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      users: z
        .array(
          z.object({
            username: z.string().describe('Email address for the new user'),
            fullname: z.string().optional().describe('Full name of the user'),
            groups: z
              .array(z.string())
              .optional()
              .describe('Group names to assign the user to')
          })
        )
        .min(1)
        .describe('List of users to provision')
    })
  )
  .output(
    z.object({
      status: z.string().describe('API response status (OK, WARN, or error)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LastPassClient({
      companyId: ctx.auth.companyId,
      provisioningHash: ctx.auth.provisioningHash
    });

    let usersToAdd = ctx.input.users.map(u => ({
      username: u.username,
      fullname: u.fullname,
      groups: u.groups
    }));

    let result = await client.batchAdd(usersToAdd);

    let userList = ctx.input.users.map(u => u.username).join(', ');

    return {
      output: {
        status: result.status || 'OK'
      },
      message: `Provisioned **${ctx.input.users.length}** user(s): ${userList}.`
    };
  })
  .build();

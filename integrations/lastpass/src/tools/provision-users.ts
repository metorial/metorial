import { SlateTool } from 'slates';
import { z } from 'zod';
import { LastPassClient } from '../lib/client';
import { spec } from '../spec';

export let provisionUsers = SlateTool.create(spec, {
  name: 'Provision Users',
  key: 'provision_users',
  description: `Create new user accounts in LastPass Enterprise. Add one or more users by email, optionally assigning them to groups and setting a full name. New users may receive activation emails; notifications and audit history cannot be rolled back.`,
  instructions: [
    'Each user requires at minimum a **username** (email address).',
    'Optionally provide **fullname** and **groups** for each user.'
  ],
  constraints: [
    'Provisioning can send email and retain audit history. WARN does not confirm all users were created.'
  ],
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
      warnings: z
        .array(z.string())
        .optional()
        .describe('Native warnings; some requested changes may not have applied'),
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
        status: result.status,
        warnings: result.warnings
      },
      message:
        result.status === 'WARN'
          ? 'LastPass reported warnings; verify each requested user before retrying provisioning.'
          : `LastPass accepted provisioning for **${ctx.input.users.length}** user(s): ${userList}.`
    };
  })
  .build();

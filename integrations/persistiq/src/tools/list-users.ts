import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().describe('Unique identifier for the user'),
  email: z.string().optional().nullable().describe('Email address of the user'),
  name: z.string().optional().nullable().describe('Name of the user'),
  activated: z
    .boolean()
    .optional()
    .nullable()
    .describe('Whether the user account is activated'),
  defaultMailboxId: z
    .string()
    .optional()
    .nullable()
    .describe('Default mailbox ID for this user'),
  salesforceId: z.string().optional().nullable().describe('Salesforce ID if connected')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users (team members) in your PersistIQ account. Returns user details including name, email, activation status, and default mailbox ID. Useful for finding user IDs for lead assignment and mailbox IDs for campaign operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(userSchema).describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listUsers();

    let users = (result.users || []).map((u: any) => ({
      userId: u.id,
      email: u.email,
      name: u.name,
      activated: u.activated,
      defaultMailboxId: u.default_mailbox_id,
      salesforceId: u.salesforce_id
    }));

    return {
      output: { users },
      message: `Retrieved **${users.length}** users.`
    };
  })
  .build();

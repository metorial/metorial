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
  salesforceId: z.string().optional().nullable().describe('Salesforce ID if connected'),
  mailboxes: z
    .array(
      z.object({
        mailboxId: z.string().describe('Mailbox ID for campaign enrollment'),
        email: z.string().optional().describe('Mailbox email address'),
        campaignIds: z
          .array(z.string())
          .optional()
          .describe('Campaign IDs associated with the mailbox')
      })
    )
    .optional()
    .describe('Available sending mailboxes')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users (team members) in your PersistIQ account. Returns user details including name, email, activation status, and default mailbox ID. Useful for finding user IDs for lead assignment and mailbox IDs for campaign operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().int().min(0).optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of users'),
      hasMore: z.boolean().optional().describe('Whether more users are available'),
      nextPage: z
        .string()
        .optional()
        .nullable()
        .describe('Provider continuation value for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listUsers(ctx.input.page);

    let users = (result.users || []).map(u => ({
      userId: u.id,
      email: u.email,
      name: u.name,
      activated: u.activated,
      defaultMailboxId: u.default_mailbox_id,
      salesforceId: u.salesforce_id,
      mailboxes: u.mailboxes?.map(mailbox => ({
        mailboxId: mailbox.id,
        email: mailbox.email,
        campaignIds: mailbox.campaign_ids
      }))
    }));

    return {
      output: {
        users,
        hasMore: result.has_more ?? !!result.next_page,
        nextPage: result.next_page
      },
      message: `Retrieved **${users.length}** users.`
    };
  })
  .build();

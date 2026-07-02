import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchUsers = SlateTool.create(spec, {
  name: 'Search Inbox Users',
  key: 'search_inbox_users',
  description: `Search for users within a specific shared inbox. Can list all users or search by name/email query. Useful for finding team members to assign conversations to.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('ID of the inbox to search users in'),
      query: z
        .string()
        .optional()
        .describe(
          'Search query to filter users by name or email. Leave empty to list all users.'
        )
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('Unique identifier of the user'),
            name: z.string().optional().describe('Name of the user'),
            email: z.string().optional().describe('Email address of the user'),
            role: z.string().optional().describe('Role of the user')
          })
        )
        .describe('List of matching users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let users: any;
    if (ctx.input.query) {
      users = await client.searchInboxUsers(ctx.input.inboxId, ctx.input.query);
    } else {
      users = await client.getInboxUsers(ctx.input.inboxId);
    }

    let mapped = users.map((u: any) => ({
      userId: String(u.id),
      name: u.name,
      email: u.email,
      role: u.role
    }));

    return {
      output: { users: mapped },
      message: `Found **${mapped.length}** user(s)${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  });

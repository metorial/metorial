import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInbox = SlateTool.create(spec, {
  name: 'Get Inbox',
  key: 'get_inbox',
  description: `Retrieve detailed information about a specific shared inbox by its ID, including its users and tags. Provides a complete view of the inbox's team members and available categorization tags.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('ID of the inbox to retrieve'),
      includeUsers: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include users in the inbox'),
      includeTags: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include tags in the inbox')
    })
  )
  .output(
    z.object({
      inboxId: z.string().describe('Unique identifier of the inbox'),
      name: z.string().describe('Display name of the inbox'),
      email: z.string().optional().describe('Email address of the inbox'),
      type: z.string().optional().describe('Type of the inbox'),
      users: z
        .array(
          z.object({
            userId: z.string().describe('Unique identifier of the user'),
            name: z.string().optional().describe('Name of the user'),
            email: z.string().optional().describe('Email address of the user'),
            role: z.string().optional().describe('Role of the user in the inbox')
          })
        )
        .optional()
        .describe('Users with access to this inbox'),
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('Unique identifier of the tag'),
            name: z.string().optional().describe('Name of the tag'),
            color: z.string().optional().describe('Color of the tag')
          })
        )
        .optional()
        .describe('Tags available in this inbox')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let inbox = await client.getInbox(ctx.input.inboxId);

    let users: any;
    if (ctx.input.includeUsers) {
      let rawUsers = await client.getInboxUsers(ctx.input.inboxId);
      users = rawUsers.map(u => ({
        userId: String(u.id),
        name: u.name,
        email: u.email,
        role: u.role
      }));
    }

    let tags: any;
    if (ctx.input.includeTags) {
      let rawTags = await client.getInboxTags(ctx.input.inboxId);
      tags = rawTags.map(t => ({
        tagId: String(t.id),
        name: t.name,
        color: t.color
      }));
    }

    return {
      output: {
        inboxId: String(inbox.id),
        name: inbox.name ?? '',
        email: inbox.email,
        type: inbox.type,
        users,
        tags
      },
      message: `Retrieved inbox **${inbox.name}**${users ? ` with ${users.length} user(s)` : ''}${tags ? ` and ${tags.length} tag(s)` : ''}.`
    };
  });

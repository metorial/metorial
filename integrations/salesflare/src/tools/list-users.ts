import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List team members (users) in Salesflare. Filter by name, email, or search term. Useful for finding user IDs to assign as owners, assignees, or task participants.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search users by name or email'),
      name: z.string().optional().describe('Filter by user name'),
      email: z.string().optional().describe('Filter by user email'),
      onlyEnabled: z.boolean().optional().describe('Only return enabled (active) users'),
      limit: z.number().optional().default(20).describe('Max results to return'),
      offset: z.number().optional().default(0).describe('Pagination offset')
    })
  )
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.any())).describe('List of user objects'),
      count: z.number().describe('Number of users returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let params: Record<string, any> = {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    };
    if (ctx.input.search) params.search = ctx.input.search;
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.email) params.email = ctx.input.email;
    if (ctx.input.onlyEnabled !== undefined) params.onlyEnabled = ctx.input.onlyEnabled;

    let users = await client.listUsers(params);
    let list = Array.isArray(users) ? users : [];

    return {
      output: {
        users: list,
        count: list.length
      },
      message: `Found **${list.length}** user(s).`
    };
  })
  .build();

export let getMe = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Retrieve details of the currently authenticated user, including team information, plan, subscription status, permissions, data sources, and settings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      user: z.record(z.string(), z.any()).describe('Current user details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let user = await client.getMe();

    return {
      output: { user },
      message: `Current user: **${user.name || user.email}** (ID: ${user.id}).`
    };
  })
  .build();

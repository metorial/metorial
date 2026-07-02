import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userOutputSchema = z.object({
  userId: z.number().describe('User ID'),
  firstname: z.string().optional().describe('First name'),
  lastname: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Email address'),
  active: z.boolean().optional().describe('Whether the user is active'),
  mobile: z.string().optional().describe('Mobile phone number'),
  unit: z.any().optional().describe('Organizational unit/team'),
  tags: z.array(z.string()).optional().describe('User tags'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapUser = (u: any) => ({
  userId: u.id,
  firstname: u.firstname,
  lastname: u.lastname,
  email: u.email,
  active: u.active,
  mobile: u.mobile,
  unit: u.unit,
  tags: u.tags,
  createdAt: u.created_at,
  updatedAt: u.updated_at
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve a list of users/staff members. Supports filtering by archived status, tags, and email.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeArchived: z.boolean().optional().describe('Include archived/deactivated users'),
      tags: z.string().optional().describe('Comma-separated list of tags to filter by'),
      email: z.string().optional().describe('Filter by email address')
    })
  )
  .output(
    z.object({
      users: z.array(userOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let params: Record<string, any> = {};
    if (ctx.input.includeArchived) params.include_archived = ctx.input.includeArchived;
    if (ctx.input.tags) params.tags = ctx.input.tags;
    if (ctx.input.email) params.email = ctx.input.email;

    let data = await client.listUsers(params);
    let users = (data as any[]).map(mapUser);

    return {
      output: { users },
      message: `Found **${users.length}** users.`
    };
  })
  .build();

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed information about a specific user/staff member.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('The ID of the user to retrieve')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    let u = await client.getUser(ctx.input.userId);

    return {
      output: mapUser(u),
      message: `Retrieved user **${u.firstname} ${u.lastname}** (ID: ${u.id}).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List user accounts on a membership-enabled Webflow site. Returns user details including email, status, and access group assignments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Unique identifier of the Webflow site'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of users to return'),
      sort: z
        .enum([
          'CreatedOn',
          '-CreatedOn',
          'LastUpdated',
          '-LastUpdated',
          'Status',
          '-Status',
          'Email',
          '-Email'
        ])
        .optional()
        .describe('Sort order (prefix with - for descending)')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('User account ID'),
            email: z.string().optional().describe('User email address'),
            status: z.string().optional().describe('Account status'),
            createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
            lastUpdated: z.string().optional().describe('ISO 8601 last update timestamp'),
            accessGroups: z
              .array(z.any())
              .optional()
              .describe('Access groups the user belongs to')
          })
        )
        .describe('List of user accounts'),
      pagination: z
        .object({
          offset: z.number().optional(),
          limit: z.number().optional(),
          total: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let data = await client.listUsers(ctx.input.siteId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      sort: ctx.input.sort
    });

    let users = (data.users ?? []).map((u: any) => ({
      userId: u.id ?? u._id,
      email: u.email,
      status: u.status,
      createdOn: u.createdOn,
      lastUpdated: u.lastUpdated,
      accessGroups: u.accessGroups
    }));

    return {
      output: { users, pagination: data.pagination },
      message: `Found **${users.length}** user(s) on site **${ctx.input.siteId}**.`
    };
  })
  .build();

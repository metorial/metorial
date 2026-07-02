import { SlateTool } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in your Aha! account. You can filter by email to look up a specific user. Returns user names, emails, and IDs for use in assigning features, ideas, and other records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by exact email address'),
      page: z.number().optional().describe('Page number (1-indexed)'),
      perPage: z.number().optional().describe('Records per page (max 200)')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string().describe('User ID'),
          name: z.string().describe('User name'),
          email: z.string().optional().describe('User email'),
          createdAt: z.string().optional().describe('User creation timestamp')
        })
      ),
      totalRecords: z.number().describe('Total number of users'),
      totalPages: z.number().describe('Total number of pages'),
      currentPage: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AhaClient(ctx.config.subdomain, ctx.auth.token);

    let result = await client.listUsers({
      email: ctx.input.email,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let users = result.users.map(u => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.created_at
    }));

    return {
      output: {
        users,
        totalRecords: result.pagination.total_records,
        totalPages: result.pagination.total_pages,
        currentPage: result.pagination.current_page
      },
      message: `Found **${result.pagination.total_records}** users (page ${result.pagination.current_page}/${result.pagination.total_pages}).`
    };
  })
  .build();

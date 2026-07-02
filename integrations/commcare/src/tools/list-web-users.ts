import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWebUsers = SlateTool.create(spec, {
  name: 'List Web Users',
  key: 'list_web_users',
  description: `Retrieve web users for a CommCare project. Web users are administrative users who access CommCare HQ via the web interface for project management, reporting, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 20)'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string(),
          username: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          email: z.string(),
          isAdmin: z.boolean(),
          role: z.string(),
          permissions: z.record(z.string(), z.any())
        })
      ),
      totalCount: z.number(),
      hasMore: z.boolean(),
      limit: z.number(),
      offset: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      domain: ctx.config.domain,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.listWebUsers({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let users = result.objects.map(u => ({
      userId: u.id,
      username: u.username,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      isAdmin: u.is_admin,
      role: u.role,
      permissions: u.permissions
    }));

    return {
      output: {
        users,
        totalCount: result.meta.total_count,
        hasMore: result.meta.next !== null,
        limit: result.meta.limit,
        offset: result.meta.offset
      },
      message: `Found **${result.meta.total_count}** web users. Returned ${users.length} results.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description:
    'List organization users and their IDs for project membership and time entry assignees. Requires administrator or eligible project-management permissions; email addresses are visible only to administrators.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      search: z.string().optional().describe('Search organization users.'),
      active: z.boolean().optional().describe('Filter by active or archived users.'),
      page: z.number().int().min(1).optional().describe('Page number, starting at 1.'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(250)
        .optional()
        .describe('Results per page, up to 250.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total matching users.'),
      users: z
        .array(z.any())
        .describe('Organization users including user_id, name, and active state.'),
      hasMore: z.boolean().describe('Whether another page is available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.input.organizationId ?? ctx.config.organizationId
    });
    let result = await client.listUsers({
      search: ctx.input.search,
      active: ctx.input.active === undefined ? undefined : ctx.input.active ? '1' : '0',
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });
    return {
      output: {
        totalCount: result.count,
        users: result.results,
        hasMore: Boolean(result.next)
      },
      message: `Found ${result.count} organization users; returned ${result.results.length} on this page.`
    };
  })
  .build();

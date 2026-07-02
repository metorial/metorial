import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in your incident.io organization with pagination. Returns user names, emails, and roles.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z.number().min(1).max(250).optional().describe('Number of results per page'),
      after: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string(),
          name: z.string().optional(),
          email: z.string().optional(),
          role: z.string().optional(),
          slackUserId: z.string().optional()
        })
      ),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listUsers({
      pageSize: ctx.input.pageSize,
      after: ctx.input.after
    });

    let users = result.users.map((u: any) => ({
      userId: u.id,
      name: u.name || undefined,
      email: u.email || undefined,
      role: u.role || undefined,
      slackUserId: u.slack_user_id || undefined
    }));

    return {
      output: {
        users,
        nextCursor: result.pagination_meta?.after || undefined
      },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();

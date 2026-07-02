import { SlateTool } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List PagerDuty users with optional search query and team filtering. Returns user details including name, email, role, and team memberships.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter users by name or email'),
      teamIds: z.array(z.string()).optional().describe('Filter by team IDs'),
      limit: z.number().optional().describe('Max results (default 25, max 100)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string().describe('User ID'),
          name: z.string().optional().describe('User name'),
          email: z.string().optional().describe('User email'),
          role: z.string().optional().describe('User role'),
          jobTitle: z.string().optional().describe('Job title'),
          timeZone: z.string().optional().describe('Time zone'),
          htmlUrl: z.string().optional().describe('Web URL'),
          avatarUrl: z.string().optional().describe('Avatar URL'),
          teamNames: z.array(z.string()).optional().describe('Associated team names')
        })
      ),
      more: z.boolean().describe('Whether more results are available'),
      total: z.number().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PagerDutyClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      region: ctx.config.region
    });

    let result = await client.listUsers({
      query: ctx.input.query,
      teamIds: ctx.input.teamIds,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let users = result.users.map(u => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      jobTitle: u.job_title,
      timeZone: u.time_zone,
      htmlUrl: u.html_url,
      avatarUrl: u.avatar_url,
      teamNames: u.teams?.map(t => t.summary).filter(Boolean) as string[] | undefined
    }));

    return {
      output: {
        users,
        more: result.more,
        total: result.total
      },
      message: `Found **${result.total}** user(s). Returned ${users.length} result(s).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { spec } from '../spec';

export let listSchedules = SlateTool.create(spec, {
  name: 'List Schedules',
  key: 'list_schedules',
  description: `List PagerDuty on-call schedules with optional search filtering. Returns schedule details including time zone, users, and associated escalation policies.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter by name'),
      limit: z.number().optional().describe('Max results (default 25, max 100)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      schedules: z.array(
        z.object({
          scheduleId: z.string().describe('Schedule ID'),
          name: z.string().optional().describe('Schedule name'),
          description: z.string().optional().describe('Schedule description'),
          timeZone: z.string().optional().describe('Schedule time zone'),
          htmlUrl: z.string().optional().describe('Web URL'),
          userNames: z.array(z.string()).optional().describe('Users in the schedule'),
          escalationPolicyNames: z
            .array(z.string())
            .optional()
            .describe('Associated escalation policy names')
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

    let result = await client.listSchedules({
      query: ctx.input.query,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let schedules = result.schedules.map(s => ({
      scheduleId: s.id,
      name: s.name,
      description: s.description,
      timeZone: s.time_zone,
      htmlUrl: s.html_url,
      userNames: s.users?.map(u => u.summary).filter(Boolean) as string[] | undefined,
      escalationPolicyNames: s.escalation_policies?.map(ep => ep.summary).filter(Boolean) as
        | string[]
        | undefined
    }));

    return {
      output: {
        schedules,
        more: result.more,
        total: result.total
      },
      message: `Found **${result.total}** schedule(s). Returned ${schedules.length} result(s).`
    };
  })
  .build();

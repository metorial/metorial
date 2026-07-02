import { SlateTool } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { spec } from '../spec';

export let listOnCalls = SlateTool.create(spec, {
  name: 'List On-Calls',
  key: 'list_on_calls',
  description: `Query who is currently on-call across schedules, escalation policies, or for specific users. Can be filtered by time range and escalation level. Useful for determining responder availability.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scheduleIds: z.array(z.string()).optional().describe('Filter by schedule IDs'),
      userIds: z.array(z.string()).optional().describe('Filter by user IDs'),
      escalationPolicyIds: z
        .array(z.string())
        .optional()
        .describe('Filter by escalation policy IDs'),
      since: z.string().optional().describe('Start of time range (ISO 8601)'),
      until: z.string().optional().describe('End of time range (ISO 8601)'),
      earliest: z
        .boolean()
        .optional()
        .describe('Only return the earliest on-call for each combination'),
      limit: z.number().optional().describe('Max results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      onCalls: z.array(
        z.object({
          userId: z.string().optional().describe('On-call user ID'),
          userName: z.string().optional().describe('On-call user name'),
          scheduleId: z.string().optional().describe('Schedule ID'),
          scheduleName: z.string().optional().describe('Schedule name'),
          escalationPolicyId: z.string().optional().describe('Escalation policy ID'),
          escalationPolicyName: z.string().optional().describe('Escalation policy name'),
          escalationLevel: z.number().optional().describe('Escalation level'),
          start: z.string().optional().describe('On-call period start'),
          end: z.string().optional().describe('On-call period end')
        })
      ),
      more: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PagerDutyClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      region: ctx.config.region
    });

    let result = await client.listOnCalls({
      scheduleIds: ctx.input.scheduleIds,
      userIds: ctx.input.userIds,
      escalationPolicyIds: ctx.input.escalationPolicyIds,
      since: ctx.input.since,
      until: ctx.input.until,
      earliest: ctx.input.earliest,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let onCalls = result.oncalls.map(oc => ({
      userId: oc.user?.id,
      userName: oc.user?.summary,
      scheduleId: oc.schedule?.id,
      scheduleName: oc.schedule?.summary,
      escalationPolicyId: oc.escalation_policy?.id,
      escalationPolicyName: oc.escalation_policy?.summary,
      escalationLevel: oc.escalation_level,
      start: oc.start,
      end: oc.end
    }));

    return {
      output: {
        onCalls,
        more: result.more
      },
      message: `Found **${onCalls.length}** on-call entry/entries.`
    };
  })
  .build();

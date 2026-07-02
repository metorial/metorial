import { SlateTool } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { spec } from '../spec';

export let listEscalationPolicies = SlateTool.create(spec, {
  name: 'List Escalation Policies',
  key: 'list_escalation_policies',
  description: `List PagerDuty escalation policies with optional filtering by name, user, or team. Returns policy details including escalation rules and targets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter by name'),
      userIds: z
        .array(z.string())
        .optional()
        .describe('Filter to policies with these user IDs as targets'),
      teamIds: z.array(z.string()).optional().describe('Filter by team IDs'),
      limit: z.number().optional().describe('Max results (default 25, max 100)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      escalationPolicies: z.array(
        z.object({
          policyId: z.string().describe('Escalation policy ID'),
          name: z.string().optional().describe('Policy name'),
          description: z.string().optional().describe('Policy description'),
          numLoops: z
            .number()
            .optional()
            .describe(
              'Number of times the policy loops before an incident goes unacknowledged'
            ),
          htmlUrl: z.string().optional().describe('Web URL'),
          escalationRules: z
            .array(
              z.object({
                ruleId: z.string().describe('Escalation rule ID'),
                delayMinutes: z.number().describe('Delay before escalating to next level'),
                targets: z.array(
                  z.object({
                    targetId: z.string(),
                    targetType: z.string(),
                    targetName: z.string().optional()
                  })
                )
              })
            )
            .optional()
            .describe('Escalation levels and their targets'),
          serviceCount: z.number().optional().describe('Number of associated services'),
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

    let result = await client.listEscalationPolicies({
      query: ctx.input.query,
      userIds: ctx.input.userIds,
      teamIds: ctx.input.teamIds,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let policies = result.escalation_policies.map(ep => ({
      policyId: ep.id,
      name: ep.name,
      description: ep.description,
      numLoops: ep.num_loops,
      htmlUrl: ep.html_url,
      escalationRules: ep.escalation_rules?.map(rule => ({
        ruleId: rule.id,
        delayMinutes: rule.escalation_delay_in_minutes,
        targets: rule.targets.map(t => ({
          targetId: t.id,
          targetType: t.type,
          targetName: t.summary
        }))
      })),
      serviceCount: ep.services?.length,
      teamNames: ep.teams?.map(t => t.summary).filter(Boolean) as string[] | undefined
    }));

    return {
      output: {
        escalationPolicies: policies,
        more: result.more,
        total: result.total
      },
      message: `Found **${result.total}** escalation policy/policies. Returned ${policies.length} result(s).`
    };
  })
  .build();

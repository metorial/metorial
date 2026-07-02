import { SlateTool } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { spec } from '../spec';

export let listServices = SlateTool.create(spec, {
  name: 'List Services',
  key: 'list_services',
  description: `List PagerDuty services with optional filtering by team or search query. Returns service details including status, escalation policy, and integrations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter services by name'),
      teamIds: z.array(z.string()).optional().describe('Filter by team IDs'),
      limit: z.number().optional().describe('Max results (default 25, max 100)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      services: z.array(
        z.object({
          serviceId: z.string().describe('Service ID'),
          name: z.string().optional().describe('Service name'),
          description: z.string().optional().describe('Service description'),
          status: z
            .string()
            .optional()
            .describe('Service status (active, warning, critical, maintenance, disabled)'),
          htmlUrl: z.string().optional().describe('Web URL'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          escalationPolicyId: z.string().optional().describe('Escalation policy ID'),
          escalationPolicyName: z.string().optional().describe('Escalation policy name'),
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

    let result = await client.listServices({
      query: ctx.input.query,
      teamIds: ctx.input.teamIds,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let services = result.services.map(svc => ({
      serviceId: svc.id,
      name: svc.name,
      description: svc.description,
      status: svc.status,
      htmlUrl: svc.html_url,
      createdAt: svc.created_at,
      escalationPolicyId: svc.escalation_policy?.id,
      escalationPolicyName: svc.escalation_policy?.summary,
      teamNames: svc.teams?.map(t => t.summary).filter(Boolean) as string[] | undefined
    }));

    return {
      output: {
        services,
        more: result.more,
        total: result.total
      },
      message: `Found **${result.total}** service(s). Returned ${services.length} result(s).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { spec } from '../spec';

export let listIncidents = SlateTool.create(spec, {
  name: 'List Incidents',
  key: 'list_incidents',
  description: `List and search PagerDuty incidents with filtering by status, service, team, user, urgency, and time range. Returns incident details including assignments, priority, and alert counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      statuses: z
        .array(z.enum(['triggered', 'acknowledged', 'resolved']))
        .optional()
        .describe('Filter by incident statuses'),
      serviceIds: z.array(z.string()).optional().describe('Filter by service IDs'),
      teamIds: z.array(z.string()).optional().describe('Filter by team IDs'),
      userIds: z.array(z.string()).optional().describe('Filter by assigned user IDs'),
      urgencies: z
        .array(z.enum(['high', 'low']))
        .optional()
        .describe('Filter by urgency levels'),
      since: z.string().optional().describe('Start of date range (ISO 8601)'),
      until: z.string().optional().describe('End of date range (ISO 8601)'),
      sortBy: z
        .string()
        .optional()
        .describe('Sort field (e.g., "incident_number:desc", "created_at:asc")'),
      limit: z.number().optional().describe('Max results to return (default 25, max 100)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      incidents: z.array(
        z.object({
          incidentId: z.string().describe('Incident ID'),
          incidentNumber: z.number().optional().describe('Incident number'),
          title: z.string().optional().describe('Incident title'),
          status: z.string().optional().describe('Current status'),
          urgency: z.string().optional().describe('Urgency level'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          htmlUrl: z.string().optional().describe('Web URL for the incident'),
          serviceId: z.string().optional().describe('Associated service ID'),
          serviceName: z.string().optional().describe('Associated service name'),
          assignees: z.array(z.string()).optional().describe('Assigned user names'),
          priority: z.string().optional().describe('Priority name'),
          alertCounts: z
            .object({
              total: z.number(),
              triggered: z.number(),
              resolved: z.number()
            })
            .optional()
            .describe('Alert count summary')
        })
      ),
      more: z.boolean().describe('Whether more results are available'),
      total: z.number().describe('Total count of matching incidents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PagerDutyClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      region: ctx.config.region
    });

    let result = await client.listIncidents({
      statuses: ctx.input.statuses,
      serviceIds: ctx.input.serviceIds,
      teamIds: ctx.input.teamIds,
      userIds: ctx.input.userIds,
      urgencies: ctx.input.urgencies,
      since: ctx.input.since,
      until: ctx.input.until,
      sortBy: ctx.input.sortBy,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let incidents = result.incidents.map(inc => ({
      incidentId: inc.id,
      incidentNumber: inc.incident_number,
      title: inc.title,
      status: inc.status,
      urgency: inc.urgency,
      createdAt: inc.created_at,
      htmlUrl: inc.html_url,
      serviceId: inc.service?.id,
      serviceName: inc.service?.summary,
      assignees: inc.assignments?.map(a => a.assignee?.summary).filter(Boolean) as
        | string[]
        | undefined,
      priority: inc.priority?.summary || inc.priority?.name,
      alertCounts: inc.alert_counts
        ? {
            total: inc.alert_counts.all,
            triggered: inc.alert_counts.triggered,
            resolved: inc.alert_counts.resolved
          }
        : undefined
    }));

    return {
      output: {
        incidents,
        more: result.more,
        total: result.total
      },
      message: `Found **${result.total}** incident(s). Returned ${incidents.length} result(s).`
    };
  })
  .build();

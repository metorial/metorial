import { SlateTool } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { spec } from '../spec';

export let getAnalytics = SlateTool.create(spec, {
  name: 'Get Incident Analytics',
  key: 'get_analytics',
  description: `Retrieve aggregated incident analytics from PagerDuty. Includes metrics like mean time to resolve, mean time to acknowledge, total incident count, and uptime percentage. Can be filtered by time range, services, teams, and urgency.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      since: z.string().optional().describe('Start of time range (ISO 8601)'),
      until: z.string().optional().describe('End of time range (ISO 8601)'),
      serviceIds: z.array(z.string()).optional().describe('Filter by service IDs'),
      teamIds: z.array(z.string()).optional().describe('Filter by team IDs'),
      urgency: z.enum(['high', 'low']).optional().describe('Filter by urgency')
    })
  )
  .output(
    z.object({
      metrics: z.array(
        z.object({
          meanSecondsToResolve: z
            .number()
            .optional()
            .describe('Mean time to resolve in seconds'),
          meanSecondsToFirstAck: z
            .number()
            .optional()
            .describe('Mean time to first acknowledge in seconds'),
          meanSecondsToEngage: z
            .number()
            .optional()
            .describe('Mean time to engage in seconds'),
          meanSecondsToMobilize: z
            .number()
            .optional()
            .describe('Mean time to mobilize in seconds'),
          totalIncidentCount: z.number().optional().describe('Total number of incidents'),
          totalInterruptionCount: z.number().optional().describe('Total interruptions'),
          totalNotificationCount: z.number().optional().describe('Total notifications sent'),
          uptimePercent: z.number().optional().describe('Uptime percentage'),
          rangeStart: z.string().optional().describe('Start of the metric range'),
          serviceId: z.string().optional().describe('Service ID (if aggregated by service)'),
          serviceName: z.string().optional().describe('Service name'),
          teamId: z.string().optional().describe('Team ID (if aggregated by team)'),
          teamName: z.string().optional().describe('Team name')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new PagerDutyClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      region: ctx.config.region
    });

    let analyticsData = await client.getAnalyticsIncidents({
      since: ctx.input.since,
      until: ctx.input.until,
      serviceIds: ctx.input.serviceIds,
      teamIds: ctx.input.teamIds,
      urgency: ctx.input.urgency
    });

    let metrics = analyticsData.map(d => ({
      meanSecondsToResolve: d.mean_seconds_to_resolve,
      meanSecondsToFirstAck: d.mean_seconds_to_first_ack,
      meanSecondsToEngage: d.mean_seconds_to_engage,
      meanSecondsToMobilize: d.mean_seconds_to_mobilize,
      totalIncidentCount: d.total_incident_count,
      totalInterruptionCount: d.total_interruption_count,
      totalNotificationCount: d.total_notification_count,
      uptimePercent: d.up_time_pct,
      rangeStart: d.range_start,
      serviceId: d.service_id,
      serviceName: d.service_name,
      teamId: d.team_id,
      teamName: d.team_name
    }));

    return {
      output: { metrics },
      message: `Retrieved **${metrics.length}** analytics metric(s).`
    };
  })
  .build();

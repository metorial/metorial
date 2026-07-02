import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let getSlaInformationTool = SlateTool.create(spec, {
  name: 'Get SLA Information',
  key: 'get_sla_information',
  description: `Retrieve SLA (Service Level Agreement) information for a customer request. Shows active and completed SLA cycles including time to first response, time to resolution, and custom SLA metrics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      issueIdOrKey: z.string().describe('Issue key or ID of the customer request')
    })
  )
  .output(
    z.object({
      slaMetrics: z
        .array(
          z.object({
            slaName: z.string().optional().describe('Name of the SLA metric'),
            completedCycles: z
              .array(
                z.object({
                  startTime: z.string().optional().describe('Cycle start time'),
                  stopTime: z.string().optional().describe('Cycle stop time'),
                  breached: z.boolean().optional().describe('Whether the SLA was breached'),
                  goalDuration: z.any().optional().describe('SLA goal duration'),
                  elapsedTime: z.any().optional().describe('Elapsed time in the cycle'),
                  remainingTime: z.any().optional().describe('Remaining time in the cycle')
                })
              )
              .optional()
              .describe('Completed SLA cycles'),
            ongoingCycle: z
              .object({
                startTime: z.string().optional().describe('Cycle start time'),
                breached: z.boolean().optional().describe('Whether the SLA has been breached'),
                paused: z
                  .boolean()
                  .optional()
                  .describe('Whether the SLA cycle is currently paused'),
                withinCalendarHours: z
                  .boolean()
                  .optional()
                  .describe('Whether currently within calendar hours'),
                goalDuration: z.any().optional().describe('SLA goal duration'),
                elapsedTime: z.any().optional().describe('Elapsed time'),
                remainingTime: z.any().optional().describe('Remaining time')
              })
              .optional()
              .describe('Currently ongoing SLA cycle')
          })
        )
        .describe('SLA metrics for the request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId
    });

    let result = await client.getSlaInformation(ctx.input.issueIdOrKey);

    let slaMetrics = (result.values || []).map((sla: any) => ({
      slaName: sla.name,
      completedCycles: sla.completedCycles?.map((cycle: any) => ({
        startTime: cycle.startTime?.iso8601,
        stopTime: cycle.stopTime?.iso8601,
        breached: cycle.breached,
        goalDuration: cycle.goalDuration,
        elapsedTime: cycle.elapsedTime,
        remainingTime: cycle.remainingTime
      })),
      ongoingCycle: sla.ongoingCycle
        ? {
            startTime: sla.ongoingCycle.startTime?.iso8601,
            breached: sla.ongoingCycle.breached,
            paused: sla.ongoingCycle.paused,
            withinCalendarHours: sla.ongoingCycle.withinCalendarHours,
            goalDuration: sla.ongoingCycle.goalDuration,
            elapsedTime: sla.ongoingCycle.elapsedTime,
            remainingTime: sla.ongoingCycle.remainingTime
          }
        : undefined
    }));

    let breachedCount = slaMetrics.filter(
      (s: any) => s.ongoingCycle?.breached || s.completedCycles?.some((c: any) => c.breached)
    ).length;

    return {
      output: {
        slaMetrics
      },
      message: `Found **${slaMetrics.length}** SLA metrics for **${ctx.input.issueIdOrKey}**. ${breachedCount > 0 ? `**${breachedCount}** breached.` : 'None breached.'}`
    };
  })
  .build();

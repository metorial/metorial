import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCheckResults = SlateTool.create(spec, {
  name: 'Get Check Results',
  key: 'get_check_results',
  description: `Retrieves raw check results for a specific uptime check, including response times, statuses, and probe server details. Useful for inspecting individual check attempts and diagnosing issues over a time range.`,
  constraints: [
    'Results are stored for a limited time period determined by your Pingdom plan.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      checkId: z.number().describe('ID of the check'),
      from: z.number().optional().describe('Start timestamp (Unix epoch)'),
      to: z.number().optional().describe('End timestamp (Unix epoch)'),
      status: z
        .string()
        .optional()
        .describe('Filter by status: "up", "down", or "unconfirmed_down"'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default 100)'),
      offset: z.number().optional().describe('Offset for pagination'),
      probes: z.string().optional().describe('Comma-separated probe IDs to filter by'),
      includeAnalysis: z
        .boolean()
        .optional()
        .describe('Include root cause analysis in results')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            probeId: z.number().optional().describe('Probe server ID'),
            time: z.number().optional().describe('Timestamp (Unix epoch)'),
            status: z.string().optional().describe('Check status'),
            responseTime: z.number().optional().describe('Response time in ms'),
            statusDescription: z.string().optional().describe('Short status description'),
            statusDescriptionLong: z
              .string()
              .optional()
              .describe('Detailed status description')
          })
        )
        .describe('List of check results'),
      activeProbes: z.array(z.number()).optional().describe('Active probe IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.getCheckResults(ctx.input.checkId, {
      from: ctx.input.from,
      to: ctx.input.to,
      status: ctx.input.status,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      probes: ctx.input.probes,
      includeanalysis: ctx.input.includeAnalysis
    });

    let results = (result.results || []).map((r: any) => ({
      probeId: r.probeid,
      time: r.time,
      status: r.status,
      responseTime: r.responsetime,
      statusDescription: r.statusdesc,
      statusDescriptionLong: r.statusdesclong
    }));

    return {
      output: {
        results,
        activeProbes: result.activeprobes
      },
      message: `Retrieved **${results.length}** result(s) for check ${ctx.input.checkId}.`
    };
  })
  .build();

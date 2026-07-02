import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getZapRuns = SlateTool.create(spec, {
  name: 'Get Zap Runs',
  key: 'get_zap_runs',
  description: `Retrieve execution history for Zaps. Returns details about individual Zap runs including status, timing, input/output data, and step results.
Filter by Zap ID, date range, status, or search text to find specific runs.`,
  instructions: [
    'Valid statuses: delayed, scheduled, pending, error, error_handled, halted, throttled, held, filtered, skipped, success.',
    'Date range defaults to last 30 days if not specified.',
    'Search text matches against Zap title, input data, and output data (max 150 characters).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      zapId: z.number().optional().describe('Retrieve runs for a specific Zap'),
      fromDate: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp to filter runs on/after this date'),
      toDate: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp to filter runs before this date'),
      statuses: z
        .string()
        .optional()
        .describe('Comma-separated list of statuses to filter by (e.g., "error,success")'),
      search: z
        .string()
        .optional()
        .describe(
          'Text search against Zap title, input data, and output data (max 150 chars)'
        ),
      limit: z.number().optional().describe('Maximum number of runs to return (default: 10)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      runs: z.array(
        z.object({
          runId: z.string().describe('Unique run identifier'),
          zapId: z.number().describe('Associated Zap ID'),
          zapTitle: z.string().nullable().describe('Zap title'),
          status: z.string().describe('Run status'),
          startTime: z.string().nullable().describe('ISO 8601 start time'),
          endTime: z.string().nullable().describe('ISO 8601 end time'),
          steps: z
            .array(
              z.object({
                status: z.string().nullable().describe('Step status'),
                startTime: z.string().nullable().describe('Step start time')
              })
            )
            .describe('Step execution details'),
          dataIn: z.any().nullable().describe('Trigger input data'),
          dataOut: z.any().nullable().describe('Final output data')
        })
      ),
      totalCount: z.number().describe('Total number of matching runs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getZapRuns({
      zapId: ctx.input.zapId,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      statuses: ctx.input.statuses,
      search: ctx.input.search,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let runs = response.data.map(run => ({
      runId: run.id,
      zapId: run.zapId,
      zapTitle: run.zapTitle,
      status: run.status,
      startTime: run.startTime,
      endTime: run.endTime,
      steps: run.steps || [],
      dataIn: run.dataIn,
      dataOut: run.dataOut
    }));

    let statusCounts: Record<string, number> = {};
    for (let run of runs) {
      statusCounts[run.status] = (statusCounts[run.status] || 0) + 1;
    }
    let statusSummary = Object.entries(statusCounts)
      .map(([s, c]) => `${c} ${s}`)
      .join(', ');

    return {
      output: {
        runs,
        totalCount: response.meta.count
      },
      message: `Found **${response.meta.count}** run(s)${ctx.input.zapId ? ` for Zap ${ctx.input.zapId}` : ''}. Returned ${runs.length}: ${statusSummary || 'none'}.`
    };
  })
  .build();

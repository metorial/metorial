import { SlateTool } from 'slates';
import { z } from 'zod';
import { ModeClient } from '../lib/client';
import { getEmbedded, normalizeQueryRun, normalizeReportRun } from '../lib/helpers';
import { spec } from '../spec';

export let runReport = SlateTool.create(spec, {
  name: 'Run Report',
  key: 'run_report',
  description: `Trigger a new execution (run) of a Mode report. Optionally pass parameters to customize the run. Returns the run's token and initial state so you can track its progress.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      reportToken: z.string().describe('Token of the report to run'),
      parameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional key-value parameters to pass to the report run')
    })
  )
  .output(
    z.object({
      runToken: z.string().describe('Token of the created report run'),
      state: z
        .string()
        .describe('Current state of the run (e.g. pending, enqueued, succeeded, failed)'),
      createdAt: z.string().describe('ISO 8601 timestamp when the run was created'),
      parameters: z.record(z.string(), z.any()).describe('Parameters passed to the run')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ModeClient({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      workspaceName: ctx.config.workspaceName
    });

    let raw = await client.createReportRun(ctx.input.reportToken, ctx.input.parameters);
    let run = normalizeReportRun(raw);

    return {
      output: {
        runToken: run.runToken,
        state: run.state,
        createdAt: run.createdAt,
        parameters: run.parameters
      },
      message: `Triggered report run **${run.runToken}** with state **${run.state}**.`
    };
  })
  .build();

export let getReportRun = SlateTool.create(spec, {
  name: 'Get Report Run',
  key: 'get_report_run',
  description: `Retrieve the status and details of a specific report run, including its state, timestamps, and associated query runs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportToken: z.string().describe('Token of the report'),
      runToken: z.string().describe('Token of the report run'),
      includeQueryRuns: z
        .boolean()
        .optional()
        .describe('Whether to also fetch query run details')
    })
  )
  .output(
    z.object({
      runToken: z.string(),
      state: z
        .string()
        .describe(
          'Current state: pending, enqueued, cancelled, failed, succeeded, completed, running_notebook'
        ),
      pythonState: z
        .string()
        .describe('Python notebook state: none, pending, failed, submitted, succeeded'),
      createdAt: z.string(),
      updatedAt: z.string(),
      completedAt: z.string(),
      parameters: z.record(z.string(), z.any()),
      queryRuns: z
        .array(
          z.object({
            queryRunToken: z.string(),
            state: z.string(),
            queryToken: z.string(),
            queryName: z.string(),
            createdAt: z.string(),
            completedAt: z.string(),
            dataSourceId: z.number()
          })
        )
        .optional()
        .describe('Query run details (if includeQueryRuns is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ModeClient({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      workspaceName: ctx.config.workspaceName
    });

    let raw = await client.getReportRun(ctx.input.reportToken, ctx.input.runToken);
    let run = normalizeReportRun(raw);

    let queryRuns: any[] | undefined;
    if (ctx.input.includeQueryRuns) {
      let qrData = await client.listQueryRuns(ctx.input.reportToken, ctx.input.runToken);
      queryRuns = getEmbedded(qrData, 'query_runs').map(normalizeQueryRun);
    }

    return {
      output: {
        ...run,
        queryRuns
      },
      message: `Report run **${run.runToken}** is in state **${run.state}**.`
    };
  })
  .build();

export let listReportRuns = SlateTool.create(spec, {
  name: 'List Report Runs',
  key: 'list_report_runs',
  description: `List all runs for a given report with filtering and ordering support. Returns a list of run statuses and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportToken: z.string().describe('Token of the report'),
      filter: z
        .string()
        .optional()
        .describe('Filter expression, e.g. "created_at.gt:2024-01-01"'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      orderBy: z.enum(['created_at', 'updated_at']).optional().describe('Field to order by')
    })
  )
  .output(
    z.object({
      runs: z.array(
        z.object({
          runToken: z.string(),
          state: z.string(),
          createdAt: z.string(),
          updatedAt: z.string(),
          completedAt: z.string(),
          parameters: z.record(z.string(), z.any())
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ModeClient({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      workspaceName: ctx.config.workspaceName
    });

    let data = await client.listReportRuns(ctx.input.reportToken, {
      filter: ctx.input.filter,
      order: ctx.input.order,
      orderBy: ctx.input.orderBy
    });

    let runs = getEmbedded(data, 'report_runs').map(normalizeReportRun);

    return {
      output: { runs },
      message: `Found **${runs.length}** report runs.`
    };
  })
  .build();

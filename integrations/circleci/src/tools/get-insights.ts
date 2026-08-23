import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { circleCiValidationError } from '../lib/validation';
import { spec } from '../spec';

export let getInsights = SlateTool.create(spec, {
  name: 'Get Insights',
  key: 'get_insights',
  description: `Retrieve workflow-level insights and metrics for a project, including success rates, durations, throughput, and trends. Optionally drill down into a specific workflow to see job-level metrics or recent runs.`,
  constraints: [
    'Workflow runs going back at most 90 days are included. Trends are only supported up to last 30 days.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectSlug: z
        .string()
        .describe('Project slug in the format vcs-slug/org-name/repo-name'),
      workflowName: z
        .string()
        .optional()
        .describe('Specific workflow name to get detailed metrics for'),
      branch: z.string().optional().describe('Filter insights by branch name'),
      reportingWindow: z
        .enum(['last-7-days', 'last-30-days', 'last-60-days', 'last-90-days', 'last-24-hours'])
        .optional()
        .describe('Time window for the report'),
      includeRuns: z
        .boolean()
        .optional()
        .describe('Include recent workflow runs (requires workflowName)'),
      includeJobMetrics: z
        .boolean()
        .optional()
        .describe('Include job-level metrics (requires workflowName)'),
      pageToken: z.string().optional().describe('Pagination token for workflow metrics'),
      runsPageToken: z.string().optional().describe('Pagination token for recent runs'),
      jobMetricsPageToken: z.string().optional().describe('Pagination token for job metrics')
    })
  )
  .output(
    z.object({
      workflowMetrics: z
        .array(
          z.object({
            name: z.string(),
            successRate: z.number().optional(),
            totalRuns: z.number().optional(),
            failedRuns: z.number().optional(),
            successfulRuns: z.number().optional(),
            throughput: z.number().optional(),
            mttr: z.number().optional().describe('Mean time to recovery in seconds'),
            durationP50: z.number().optional().describe('Median duration in seconds'),
            durationP95: z.number().optional().describe('95th percentile duration in seconds'),
            durationP99: z.number().optional().describe('99th percentile duration in seconds'),
            totalCreditsUsed: z.number().optional()
          })
        )
        .optional(),
      recentRuns: z
        .array(
          z.object({
            runId: z.string(),
            status: z.string().optional(),
            duration: z.number().optional(),
            createdAt: z.string(),
            stoppedAt: z.string().optional(),
            creditsUsed: z.number().optional()
          })
        )
        .optional(),
      jobMetrics: z
        .array(
          z.object({
            name: z.string(),
            successRate: z.number().optional(),
            totalRuns: z.number().optional(),
            failedRuns: z.number().optional(),
            durationP50: z.number().optional(),
            durationP95: z.number().optional()
          })
        )
        .optional(),
      workflowTrends: z
        .object({
          totalRuns: z.number().optional(),
          failedRuns: z.number().optional(),
          successRate: z.number().optional(),
          medianDurationSeconds: z.number().optional(),
          p95DurationSeconds: z.number().optional(),
          totalCreditsUsed: z.number().optional(),
          mttr: z.number().optional(),
          throughput: z.number().optional()
        })
        .optional()
        .describe('Trend values returned for a specific workflow'),
      workflowMetricsNextPageToken: z.string().nullable().optional(),
      recentRunsNextPageToken: z.string().nullable().optional(),
      jobMetricsNextPageToken: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.workflowName && ctx.input.pageToken) {
      throw circleCiValidationError(
        'pageToken is only supported when retrieving project-level workflow metrics without workflowName.'
      );
    }
    if (ctx.input.runsPageToken && (!ctx.input.workflowName || !ctx.input.includeRuns)) {
      throw circleCiValidationError(
        'runsPageToken requires workflowName and includeRuns to be enabled.'
      );
    }
    if (
      ctx.input.jobMetricsPageToken &&
      (!ctx.input.workflowName || !ctx.input.includeJobMetrics)
    ) {
      throw circleCiValidationError(
        'jobMetricsPageToken requires workflowName and includeJobMetrics to be enabled.'
      );
    }
    let client = new Client({ token: ctx.auth.token });
    let output: Record<string, any> = {};

    if (!ctx.input.workflowName) {
      if (ctx.input.includeRuns || ctx.input.includeJobMetrics) {
        throw circleCiValidationError(
          'workflowName is required when includeRuns or includeJobMetrics is enabled.'
        );
      }
      let result = await client.getProjectWorkflowMetrics(ctx.input.projectSlug, {
        branch: ctx.input.branch,
        reportingWindow: ctx.input.reportingWindow,
        pageToken: ctx.input.pageToken
      });
      output.workflowMetrics = (result.items || []).map((w: any) => ({
        name: w.name,
        successRate: w.metrics?.success_rate,
        totalRuns: w.metrics?.total_runs,
        failedRuns: w.metrics?.failed_runs,
        successfulRuns: w.metrics?.successful_runs,
        throughput: w.metrics?.throughput,
        mttr: w.metrics?.mttr,
        durationP50: w.metrics?.duration_metrics?.median,
        durationP95: w.metrics?.duration_metrics?.p95,
        durationP99: w.metrics?.duration_metrics?.p99,
        totalCreditsUsed: w.metrics?.total_credits_used
      }));
      output.workflowMetricsNextPageToken = result.next_page_token;
      return {
        output,
        message: `Found metrics for **${output.workflowMetrics.length}** workflow(s) in project \`${ctx.input.projectSlug}\`.`
      };
    }

    let summary = await client.getWorkflowSummary(
      ctx.input.projectSlug,
      ctx.input.workflowName,
      {
        branch: ctx.input.branch
      }
    );

    output.workflowMetrics = [
      {
        name: ctx.input.workflowName,
        successRate: summary.metrics?.success_rate,
        totalRuns: summary.metrics?.total_runs,
        failedRuns: summary.metrics?.failed_runs,
        successfulRuns: summary.metrics?.successful_runs,
        throughput: summary.metrics?.throughput,
        mttr: summary.metrics?.mttr,
        durationP50: summary.metrics?.duration_metrics?.median,
        durationP95: summary.metrics?.duration_metrics?.p95,
        durationP99: summary.metrics?.duration_metrics?.p99,
        totalCreditsUsed: summary.metrics?.total_credits_used
      }
    ];
    if (summary.trends) {
      output.workflowTrends = {
        totalRuns: summary.trends.total_runs,
        failedRuns: summary.trends.failed_runs,
        successRate: summary.trends.success_rate,
        medianDurationSeconds: summary.trends.median_duration_secs,
        p95DurationSeconds: summary.trends.p95_duration_secs,
        totalCreditsUsed: summary.trends.total_credits_used,
        mttr: summary.trends.mttr,
        throughput: summary.trends.throughput
      };
    }

    if (ctx.input.includeRuns) {
      let runs = await client.getWorkflowRuns(ctx.input.projectSlug, ctx.input.workflowName, {
        branch: ctx.input.branch,
        pageToken: ctx.input.runsPageToken
      });
      output.recentRuns = (runs.items || []).map((r: any) => ({
        runId: r.id,
        status: r.status,
        duration: r.duration,
        createdAt: r.created_at,
        stoppedAt: r.stopped_at,
        creditsUsed: r.credits_used
      }));
      output.recentRunsNextPageToken = runs.next_page_token;
    }

    if (ctx.input.includeJobMetrics) {
      let jobs = await client.getWorkflowJobMetrics(
        ctx.input.projectSlug,
        ctx.input.workflowName,
        {
          branch: ctx.input.branch,
          reportingWindow: ctx.input.reportingWindow,
          pageToken: ctx.input.jobMetricsPageToken
        }
      );
      output.jobMetrics = (jobs.items || []).map((j: any) => ({
        name: j.name,
        successRate: j.metrics?.success_rate,
        totalRuns: j.metrics?.total_runs,
        failedRuns: j.metrics?.failed_runs,
        durationP50: j.metrics?.duration_metrics?.median,
        durationP95: j.metrics?.duration_metrics?.p95
      }));
      output.jobMetricsNextPageToken = jobs.next_page_token;
    }

    return {
      output,
      message: `Insights for workflow **${ctx.input.workflowName}** in project \`${ctx.input.projectSlug}\`.`
    };
  })
  .build();

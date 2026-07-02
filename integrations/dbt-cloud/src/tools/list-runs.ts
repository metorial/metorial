import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

let runStatusDescriptions: Record<number, string> = {
  1: 'Queued',
  2: 'Starting',
  3: 'Running',
  10: 'Success',
  20: 'Error',
  30: 'Cancelled'
};

export let listRunsTool = SlateTool.create(spec, {
  name: 'List Runs',
  key: 'list_runs',
  description: `List dbt Cloud job runs with optional filters for job, project, environment, or status. Returns run IDs, statuses, timing, and duration. Useful for monitoring recent execution history and identifying failed or long-running jobs.`,
  instructions: [
    'Status codes: 1=Queued, 2=Starting, 3=Running, 10=Success, 20=Error, 30=Cancelled.',
    'Use orderBy="-id" to get the most recent runs first.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...accountIdInput,
      jobId: z.string().optional().describe('Filter runs by job ID'),
      projectId: z.string().optional().describe('Filter runs by project ID'),
      environmentId: z.string().optional().describe('Filter runs by environment ID'),
      status: z
        .number()
        .optional()
        .describe(
          'Filter by status code (1=Queued, 2=Starting, 3=Running, 10=Success, 20=Error, 30=Cancelled)'
        ),
      statuses: z
        .array(z.number())
        .optional()
        .describe(
          'Filter by multiple status codes (1=Queued, 2=Starting, 3=Running, 10=Success, 20=Error, 30=Cancelled)'
        ),
      orderBy: z
        .string()
        .optional()
        .describe('Order results by field (prefix with - for descending, e.g., "-id")'),
      limit: z.number().optional().describe('Maximum number of runs to return (max 100)'),
      offset: z.number().optional().describe('Number of runs to skip for pagination'),
      state: z
        .enum(['active', 'deleted', 'all'])
        .optional()
        .describe('Filter by soft deletion state'),
      dbtVersion: z.string().optional().describe('Filter by dbt version'),
      dbtVersions: z.array(z.string()).optional().describe('Filter by dbt version list'),
      includeRelated: z
        .array(z.enum(['trigger', 'job', 'audit', 'debug_logs']))
        .optional()
        .describe('Related resources to include in each run response'),
      hasDocsGenerated: z.boolean().optional().describe('Filter by docs artifact generation'),
      hasSourcesGenerated: z
        .boolean()
        .optional()
        .describe('Filter by source freshness artifact generation')
    })
  )
  .output(
    z.object({
      runs: z
        .array(
          z.object({
            runId: z.number().describe('Unique run identifier'),
            jobId: z.number().describe('Job that produced this run'),
            projectId: z.number().describe('Project the run belongs to'),
            environmentId: z.number().describe('Environment the run executed in'),
            status: z.number().describe('Run status code'),
            statusHumanized: z.string().optional().describe('Human-readable status'),
            startedAt: z.string().nullable().optional().describe('Run start timestamp'),
            finishedAt: z.string().nullable().optional().describe('Run finish timestamp'),
            durationHumanized: z.string().optional().describe('Human-readable run duration'),
            gitSha: z.string().nullable().optional().describe('Git SHA used for this run'),
            gitBranch: z
              .string()
              .nullable()
              .optional()
              .describe('Git branch used for this run'),
            createdAt: z.string().optional().describe('Run creation timestamp')
          })
        )
        .describe('List of runs')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    let runs = await client.listRuns({
      job_definition_id: ctx.input.jobId,
      project_id: ctx.input.projectId,
      environment_id: ctx.input.environmentId,
      status: ctx.input.status,
      status__in: ctx.input.statuses,
      order_by: ctx.input.orderBy,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      state: ctx.input.state,
      dbt_version: ctx.input.dbtVersion,
      dbt_version__in: ctx.input.dbtVersions,
      include_related: ctx.input.includeRelated?.join(','),
      has_docs_generated: ctx.input.hasDocsGenerated,
      has_sources_generated: ctx.input.hasSourcesGenerated
    });

    let mapped = runs.map((r: any) => ({
      runId: r.id,
      jobId: r.job_definition_id ?? r.job_id,
      projectId: r.project_id,
      environmentId: r.environment_id,
      status: r.status,
      statusHumanized: r.status_humanized ?? runStatusDescriptions[r.status as number],
      startedAt: r.started_at ?? null,
      finishedAt: r.finished_at ?? null,
      durationHumanized: r.duration_humanized,
      gitSha: r.git_sha ?? null,
      gitBranch: r.git_branch ?? null,
      createdAt: r.created_at
    }));

    return {
      output: { runs: mapped },
      message: `Found **${mapped.length}** run(s).`
    };
  })
  .build();

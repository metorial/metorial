import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

export let listJobsTool = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `List dbt Cloud jobs, optionally filtered by project or environment. Returns job names, schedules, settings, and execution configuration. Use this to discover available jobs that can be triggered or monitored.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...accountIdInput,
      projectId: z.string().optional().describe('Filter jobs by project ID'),
      environmentId: z.string().optional().describe('Filter jobs by environment ID'),
      orderBy: z
        .string()
        .optional()
        .describe('Field to order results by (prefix with - for descending, e.g., "-id")'),
      limit: z.number().optional().describe('Maximum number of jobs to return (max 100)'),
      offset: z.number().optional().describe('Number of jobs to skip for pagination'),
      nameContains: z.string().optional().describe('Case-insensitive job name filter'),
      state: z
        .enum(['active', 'deleted', 'all'])
        .optional()
        .describe('Filter by soft deletion state'),
      dbtVersions: z.array(z.string()).optional().describe('Filter by dbt version list'),
      includeRelated: z
        .array(
          z.enum([
            'environment',
            'custom_environment_variables',
            'most_recent_run',
            'most_recent_completed_run',
            'fusion_readiness'
          ])
        )
        .optional()
        .describe('Related resources to include in each job response'),
      isFusionReady: z.boolean().optional().describe('Filter jobs by Fusion readiness'),
      isSystem: z.boolean().optional().describe('Whether to include system jobs'),
      triggersSchedule: z
        .boolean()
        .optional()
        .describe('Filter jobs by whether they have schedule triggers')
    })
  )
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobId: z.number().describe('Unique job identifier'),
            accountId: z.number().describe('Account the job belongs to'),
            projectId: z.number().describe('Project the job belongs to'),
            environmentId: z.number().describe('Environment the job runs in'),
            name: z.string().describe('Job name'),
            executeSteps: z
              .array(z.string())
              .optional()
              .describe('dbt commands executed by this job'),
            state: z.number().optional().describe('Job state (1 = active, 2 = deleted)'),
            dbtVersion: z.string().nullable().optional().describe('dbt version override'),
            generateDocs: z
              .boolean()
              .optional()
              .describe('Whether docs are generated after run'),
            schedule: z.any().optional().describe('Job schedule configuration'),
            settingsThreads: z.number().optional().describe('Number of threads configured'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    let jobs = await client.listJobs({
      project_id: ctx.input.projectId,
      environment_id: ctx.input.environmentId,
      order_by: ctx.input.orderBy,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      name__icontains: ctx.input.nameContains,
      state: ctx.input.state,
      dbt_version__in: ctx.input.dbtVersions,
      include_related: ctx.input.includeRelated?.join(','),
      is_fusion_ready: ctx.input.isFusionReady,
      is_system: ctx.input.isSystem,
      triggers_schedule: ctx.input.triggersSchedule
    });

    let mapped = jobs.map((j: any) => ({
      jobId: j.id,
      accountId: j.account_id,
      projectId: j.project_id,
      environmentId: j.environment_id,
      name: j.name,
      executeSteps: j.execute_steps,
      state: j.state,
      dbtVersion: j.dbt_version ?? null,
      generateDocs: j.generate_docs,
      schedule: j.schedule,
      settingsThreads: j.settings?.threads,
      createdAt: j.created_at,
      updatedAt: j.updated_at
    }));

    return {
      output: { jobs: mapped },
      message: `Found **${mapped.length}** job(s).`
    };
  })
  .build();

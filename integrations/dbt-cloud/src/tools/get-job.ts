import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

export let getJobTool = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description: `Retrieve detailed information about a specific dbt Cloud job, including its schedule, execution steps, settings, and run history metadata. Use this to inspect a job's full configuration before triggering or modifying it.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...accountIdInput,
      jobId: z.string().describe('The unique ID of the job to retrieve')
    })
  )
  .output(
    z.object({
      jobId: z.number().describe('Unique job identifier'),
      accountId: z.number().describe('Account the job belongs to'),
      projectId: z.number().describe('Project the job belongs to'),
      environmentId: z.number().describe('Environment the job runs in'),
      name: z.string().describe('Job name'),
      description: z.string().optional().describe('Job description'),
      executeSteps: z
        .array(z.string())
        .optional()
        .describe('dbt commands executed by this job'),
      state: z.number().optional().describe('Job state (1 = active, 2 = deleted)'),
      dbtVersion: z.string().nullable().optional().describe('dbt version override'),
      generateDocs: z.boolean().optional().describe('Whether docs are generated after run'),
      schedule: z.any().optional().describe('Job schedule configuration'),
      settings: z.any().optional().describe('Job settings including threads'),
      triggers: z.any().optional().describe('Job trigger configuration'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      runGenerateSources: z.boolean().optional().describe('Whether source freshness is run'),
      nextRun: z.string().nullable().optional().describe('Next scheduled run timestamp'),
      nextRunHumanized: z
        .string()
        .nullable()
        .optional()
        .describe('Human-readable next run time')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    let job = await client.getJob(ctx.input.jobId);

    return {
      output: {
        jobId: job.id,
        accountId: job.account_id,
        projectId: job.project_id,
        environmentId: job.environment_id,
        name: job.name,
        description: job.description,
        executeSteps: job.execute_steps,
        state: job.state,
        dbtVersion: job.dbt_version ?? null,
        generateDocs: job.generate_docs,
        schedule: job.schedule,
        settings: job.settings,
        triggers: job.triggers,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        runGenerateSources: job.run_generate_sources,
        nextRun: job.next_run ?? null,
        nextRunHumanized: job.next_run_humanized ?? null
      },
      message: `Retrieved job **${job.name}** (ID: ${job.id}).`
    };
  })
  .build();

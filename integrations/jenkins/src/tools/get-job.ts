import { SlateTool } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let getJob = SlateTool.create(spec, {
  name: 'Get Job Details',
  key: 'get_job',
  description: `Retrieve detailed information about a specific Jenkins job including its configuration, last build status, health reports, and recent builds. Supports jobs inside folders using slash-separated paths.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobPath: z.string().describe('Path to the job (e.g. "my-job" or "folder/my-job")')
    })
  )
  .output(
    z.object({
      jobName: z.string().describe('Name of the job'),
      jobUrl: z.string().describe('URL of the job'),
      fullName: z.string().optional().describe('Fully qualified name including folder path'),
      description: z.string().optional().nullable().describe('Job description'),
      color: z.string().optional().describe('Status color indicator'),
      buildable: z.boolean().optional().describe('Whether the job can be built'),
      inQueue: z
        .boolean()
        .optional()
        .describe('Whether the job is currently in the build queue'),
      lastBuildNumber: z.number().optional().nullable().describe('Last build number'),
      lastBuildUrl: z.string().optional().nullable().describe('Last build URL'),
      lastSuccessfulBuildNumber: z
        .number()
        .optional()
        .nullable()
        .describe('Last successful build number'),
      lastFailedBuildNumber: z
        .number()
        .optional()
        .nullable()
        .describe('Last failed build number'),
      healthScore: z.number().optional().nullable().describe('Health score (0-100)'),
      healthDescription: z
        .string()
        .optional()
        .nullable()
        .describe('Health report description'),
      nextBuildNumber: z.number().optional().describe('Next build number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JenkinsClient({
      instanceUrl: ctx.config.instanceUrl,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let job = await client.getJob(ctx.input.jobPath);
    let healthReport = job.healthReport?.[0];

    return {
      output: {
        jobName: job.name || job.displayName,
        jobUrl: job.url,
        fullName: job.fullName,
        description: job.description,
        color: job.color,
        buildable: job.buildable,
        inQueue: job.inQueue,
        lastBuildNumber: job.lastBuild?.number ?? null,
        lastBuildUrl: job.lastBuild?.url ?? null,
        lastSuccessfulBuildNumber: job.lastSuccessfulBuild?.number ?? null,
        lastFailedBuildNumber: job.lastFailedBuild?.number ?? null,
        healthScore: healthReport?.score ?? null,
        healthDescription: healthReport?.description ?? null,
        nextBuildNumber: job.nextBuildNumber
      },
      message: `Job **${job.displayName || job.name}** — status: \`${job.color || 'unknown'}\`, last build: #${job.lastBuild?.number || 'none'}.`
    };
  })
  .build();

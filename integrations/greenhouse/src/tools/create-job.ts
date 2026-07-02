import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapJob } from '../lib/mappers';
import { spec } from '../spec';

export let createJobTool = SlateTool.create(spec, {
  name: 'Create Job',
  key: 'create_job',
  description: `Create a new job in Greenhouse based on a template job. The template job's settings, stages, and configuration will be copied. Requires the **On-Behalf-Of** user ID in config.`,
  instructions: [
    'A templateJobId is required — the new job will be created as a copy of that template.',
    'Use the "List Jobs" tool to find available template jobs if needed.'
  ],
  constraints: ['Requires the onBehalfOf config value to be set for audit purposes.'],
  tags: { readOnly: false }
})
  .input(
    z.object({
      templateJobId: z.string().describe('ID of the template job to copy from'),
      jobName: z
        .string()
        .optional()
        .describe('Name for the new job (defaults to template name)'),
      numberOfOpenings: z.number().optional().describe('Number of openings for this job'),
      departmentId: z.string().optional().describe('Department ID for the new job'),
      officeIds: z.array(z.string()).optional().describe('Office IDs for the new job')
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      name: z.string(),
      status: z.string().nullable(),
      departments: z.array(z.object({ departmentId: z.string(), name: z.string() })),
      offices: z.array(z.object({ officeId: z.string(), name: z.string() })),
      createdAt: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });

    let raw = await client.createJob({
      templateJobId: Number.parseInt(ctx.input.templateJobId, 10),
      jobName: ctx.input.jobName,
      numberOfOpenings: ctx.input.numberOfOpenings,
      departmentId: ctx.input.departmentId
        ? Number.parseInt(ctx.input.departmentId, 10)
        : undefined,
      officeIds: ctx.input.officeIds?.map(id => Number.parseInt(id, 10))
    });

    let job = mapJob(raw);

    return {
      output: job,
      message: `Created job **${job.name}** (ID: ${job.jobId}).`
    };
  })
  .build();

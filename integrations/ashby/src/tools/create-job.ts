import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { spec } from '../spec';

export let createJobTool = SlateTool.create(spec, {
  name: 'Create Job',
  key: 'create_job',
  description: `Creates a new job in Ashby with a title and optional location, department, and default interview plan. Returns the created job's ID and basic details.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the job to create'),
      locationId: z.string().optional().describe('Location ID to associate with the job'),
      departmentId: z.string().optional().describe('Department ID to associate with the job'),
      defaultInterviewPlanId: z
        .string()
        .optional()
        .describe('Default interview plan ID for the job')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique ID of the created job'),
      title: z.string().describe('Title of the job'),
      status: z.string().describe('Current status of the job'),
      locationId: z.string().optional().describe('Location ID associated with the job'),
      departmentId: z.string().optional().describe('Department ID associated with the job'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AshbyClient({ token: ctx.auth.token });

    let params: Record<string, any> = {
      title: ctx.input.title
    };

    if (ctx.input.locationId !== undefined) params.locationId = ctx.input.locationId;
    if (ctx.input.departmentId !== undefined) params.departmentId = ctx.input.departmentId;
    if (ctx.input.defaultInterviewPlanId !== undefined)
      params.defaultInterviewPlanId = ctx.input.defaultInterviewPlanId;

    let result = await client.createJob(params as any);
    let job = result.results;

    return {
      output: {
        jobId: job.id,
        title: job.title,
        status: job.status,
        ...(job.locationId ? { locationId: job.locationId } : {}),
        ...(job.departmentId ? { departmentId: job.departmentId } : {}),
        createdAt: job.createdAt
      },
      message: `Created job **${job.title}** (\`${job.id}\`).`
    };
  })
  .build();

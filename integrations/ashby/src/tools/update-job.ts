import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { spec } from '../spec';

export let updateJob = SlateTool.create(spec, {
  name: 'Update Job',
  key: 'update_job',
  description: `Updates a job's details, status, or compensation. Supports changing the title, location, department, status, and compensation in a single call.`,
  instructions: [
    'Only include fields you want to change.',
    'Status changes use a separate endpoint and can be combined with other updates.',
    'Compensation updates are also handled separately and can be combined with other field changes.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The ID of the job to update'),
      title: z.string().optional().describe('New job title'),
      status: z
        .enum(['Open', 'Closed', 'Archived', 'Draft'])
        .optional()
        .describe('New job status'),
      locationId: z.string().optional().describe('New location ID'),
      departmentId: z.string().optional().describe('New department ID'),
      compensation: z
        .record(z.string(), z.any())
        .optional()
        .describe('Compensation details to update')
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      title: z.string(),
      status: z.string(),
      locationId: z.string().optional(),
      departmentId: z.string().optional(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AshbyClient({ token: ctx.auth.token });
    let { jobId, title, status, locationId, departmentId, compensation } = ctx.input;

    if (status !== undefined) {
      await client.setJobStatus(jobId, status);
    }

    if (compensation !== undefined) {
      await client.updateJobCompensation(jobId, compensation);
    }

    let updateFields: Record<string, any> = {};
    if (title !== undefined) updateFields.title = title;
    if (locationId !== undefined) updateFields.locationId = locationId;
    if (departmentId !== undefined) updateFields.departmentId = departmentId;

    if (Object.keys(updateFields).length > 0) {
      await client.updateJob(jobId, updateFields);
    }

    let result = await client.getJob(jobId);
    let job = result.results;

    return {
      output: {
        jobId: job.id,
        title: job.title,
        status: job.status,
        ...(job.locationId ? { locationId: job.locationId } : {}),
        ...(job.departmentId ? { departmentId: job.departmentId } : {}),
        updatedAt: job.updatedAt
      },
      message: `Updated job **${job.title}** (\`${job.id}\`).`
    };
  })
  .build();

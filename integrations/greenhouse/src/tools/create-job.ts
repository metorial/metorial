import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { jobOutputSchema, mapJob } from '../lib/mappers';
import { spec } from '../spec';
export const createJobTool = SlateTool.create(spec, {
  key: 'create_job',
  name: 'Create Job',
  description:
    'Create a job from an existing template. Harvest v3 requires numberOfOpenings. The API has no job deletion operation; creation leaves a job and audit history.',
  tags: { readOnly: false, destructive: true }
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
  .output(jobOutputSchema)
  .handleInvocation(async ctx => {
    return {
      output: mapJob(await new GreenhouseClient(ctx.auth, ctx.config).createJob(ctx.input)),
      message: 'Created the job. Review Greenhouse before retrying an ambiguous result.'
    };
  })
  .build();

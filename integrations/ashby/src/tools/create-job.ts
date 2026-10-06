import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { id, invalid, mapJob, pageSchema, text, warningsSchema } from '../lib/contracts';
import { spec } from '../spec';

export let createJobTool = SlateTool.create(spec, {
  name: 'Create Job',
  key: 'create_job',
  description: `Creates a new job in Ashby with a title, required location and department/team IDs, and an optional default interview plan. Use list_organization to discover the location and department. Returns the created job's ID and basic details.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the job to create'),
      locationId: z
        .string()
        .optional()
        .describe('Required location ID from list_organization locations'),
      departmentId: z
        .string()
        .optional()
        .describe('Required department/team ID from list_organization departments'),
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
      createdAt: z.string().describe('Creation timestamp'),
      warnings: warningsSchema,
      pageInfo: pageSchema.optional(),
      completedActions: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new AshbyClient(ctx.auth),
      input = ctx.input;
    if (input.departmentId === undefined || input.locationId === undefined)
      invalid(
        'Ashby job.create requires departmentId (native teamId) and locationId. Use list_organization departments/locations; choose exact IDs before creating a job.'
      );
    const result = await client.post('/job.create', {
      title: text(input.title, 'Job title'),
      teamId: id(input.departmentId, 'Department/team ID'),
      locationId: id(input.locationId, 'Location ID'),
      defaultInterviewPlanId:
        input.defaultInterviewPlanId === undefined
          ? undefined
          : id(input.defaultInterviewPlanId, 'Default interview plan ID')
    });
    return {
      output: { ...mapJob(result.results), warnings: client.warnings },
      message: 'Job creation accepted. The returned provider status is authoritative.'
    };
  })
  .build();

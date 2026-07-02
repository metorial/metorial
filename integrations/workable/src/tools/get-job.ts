import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { mapJobDetails, mapMember, mapStage } from '../lib/shapes';
import { spec } from '../spec';

export let getJobTool = SlateTool.create(spec, {
  name: 'Get Job Details',
  key: 'get_job',
  description: `Retrieve a Workable job by shortcode. Use the optional includes for stages, hiring team members, and the application form when the caller needs related setup data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobShortcode: z.string().describe('The shortcode of the job to retrieve'),
      includeStages: z
        .boolean()
        .optional()
        .describe('Also fetch pipeline stages for this job'),
      includeMembers: z
        .boolean()
        .optional()
        .describe('Also fetch hiring team members for this job'),
      includeApplicationForm: z
        .boolean()
        .optional()
        .describe('Also fetch the application form configuration')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique job ID'),
      shortcode: z.string().describe('Job shortcode'),
      code: z.string().optional().describe('Job code'),
      title: z.string().describe('Job title'),
      fullTitle: z.string().optional().describe('Full job title'),
      description: z.string().optional().describe('HTML job description'),
      fullDescription: z.string().optional().describe('Full HTML job description'),
      requirements: z.string().optional().describe('HTML requirements'),
      benefits: z.string().optional().describe('HTML benefits'),
      department: z.string().optional().describe('Department name'),
      departmentId: z.union([z.string(), z.number()]).optional().describe('Department ID'),
      location: z.any().optional().describe('Primary job location'),
      locations: z.array(z.any()).optional().describe('Additional job locations'),
      workplaceType: z.string().optional().describe('Workplace type'),
      state: z.string().describe('Job state'),
      confidential: z.boolean().optional().describe('Whether the job is confidential'),
      salary: z
        .object({
          salaryFrom: z.number().optional(),
          salaryTo: z.number().optional(),
          currency: z.string().optional()
        })
        .optional()
        .describe('Salary range'),
      employmentType: z.string().optional().describe('Employment type'),
      industry: z.string().optional().describe('Industry'),
      function: z.string().optional().describe('Job function'),
      experience: z.string().optional().describe('Experience level'),
      education: z.string().optional().describe('Education level'),
      keywords: z.array(z.string()).optional().describe('Job keywords'),
      url: z.string().optional().describe('Public job URL'),
      shortlink: z.string().optional().describe('Short public URL'),
      applicationUrl: z.string().optional().describe('Application URL'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      stages: z
        .array(
          z.object({
            slug: z.string().describe('Stage slug identifier'),
            name: z.string().describe('Stage display name'),
            kind: z.string().optional().describe('Stage kind'),
            position: z.number().optional().describe('Stage position in pipeline')
          })
        )
        .optional()
        .describe('Pipeline stages'),
      members: z
        .array(
          z.object({
            memberId: z.string().describe('Member ID'),
            name: z.string().describe('Member name'),
            email: z.string().optional(),
            headline: z.string().optional().describe('Member headline/role'),
            role: z.string().optional()
          })
        )
        .optional()
        .describe('Hiring team members'),
      applicationForm: z.any().optional().describe('Application form configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let output: any = mapJobDetails(await client.getJob(ctx.input.jobShortcode));

    if (ctx.input.includeStages) {
      let stagesResult = await client.getJobStages(ctx.input.jobShortcode);
      output.stages = (stagesResult.stages || []).map(mapStage);
    }

    if (ctx.input.includeMembers) {
      let membersResult = await client.getJobMembers(ctx.input.jobShortcode);
      output.members = (membersResult.members || []).map(mapMember);
    }

    if (ctx.input.includeApplicationForm) {
      output.applicationForm = await client.getJobApplicationForm(ctx.input.jobShortcode);
    }

    return {
      output,
      message: `Retrieved job **"${output.title}"** (${output.shortcode}) — state: ${output.state}.`
    };
  })
  .build();

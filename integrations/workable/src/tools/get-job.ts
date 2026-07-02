import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { spec } from '../spec';

export let getJobTool = SlateTool.create(spec, {
  name: 'Get Job Details',
  key: 'get_job',
  description: `Retrieve detailed information about a specific job posting including its description, requirements, benefits, salary range, pipeline stages, application form, and assigned team members. Provide the job shortcode to fetch full details.`,
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
      title: z.string().describe('Job title'),
      description: z.string().optional().describe('Full HTML job description'),
      requirements: z.string().optional().describe('HTML requirements'),
      benefits: z.string().optional().describe('HTML benefits'),
      department: z.string().optional().describe('Department name'),
      location: z
        .object({
          city: z.string().optional(),
          region: z.string().optional(),
          country: z.string().optional(),
          countryCode: z.string().optional(),
          telecommuting: z.boolean().optional()
        })
        .optional()
        .describe('Job location'),
      state: z.string().describe('Job state'),
      salary: z
        .object({
          salaryFrom: z.number().optional(),
          salaryTo: z.number().optional(),
          currency: z.string().optional()
        })
        .optional()
        .describe('Salary range'),
      url: z.string().optional().describe('Public job URL'),
      applicationUrl: z.string().optional().describe('Application URL'),
      createdAt: z.string().optional().describe('Creation timestamp'),
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
            headline: z.string().optional().describe('Member headline/role')
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

    let job = await client.getJob(ctx.input.jobShortcode);

    let output: any = {
      jobId: job.id,
      shortcode: job.shortcode,
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      benefits: job.benefits,
      department: job.department,
      location: job.location
        ? {
            city: job.location.city,
            region: job.location.region,
            country: job.location.country,
            countryCode: job.location.country_code,
            telecommuting: job.location.telecommuting
          }
        : undefined,
      state: job.state,
      salary: job.salary
        ? {
            salaryFrom: job.salary.salary_from,
            salaryTo: job.salary.salary_to,
            currency: job.salary.currency
          }
        : undefined,
      url: job.url,
      applicationUrl: job.application_url,
      createdAt: job.created_at
    };

    if (ctx.input.includeStages) {
      let stagesResult = await client.getJobStages(ctx.input.jobShortcode);
      output.stages = (stagesResult.stages || []).map((s: any) => ({
        slug: s.slug,
        name: s.name,
        kind: s.kind,
        position: s.position
      }));
    }

    if (ctx.input.includeMembers) {
      let membersResult = await client.getJobMembers(ctx.input.jobShortcode);
      output.members = (membersResult.members || []).map((m: any) => ({
        memberId: m.id,
        name: m.name,
        headline: m.headline
      }));
    }

    if (ctx.input.includeApplicationForm) {
      let formResult = await client.getJobApplicationForm(ctx.input.jobShortcode);
      output.applicationForm = formResult;
    }

    return {
      output,
      message: `Retrieved job **"${output.title}"** (${output.shortcode}) — state: ${output.state}.`
    };
  })
  .build();

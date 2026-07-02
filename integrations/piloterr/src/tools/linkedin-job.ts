import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

export let linkedinJob = SlateTool.create(spec, {
  name: 'LinkedIn Job',
  key: 'linkedin_job',
  description: `Retrieve detailed information about a specific LinkedIn job listing. Returns job title, employment type, seniority level, industry, company details, location, recruiter info, compensation, total applicants, and full job description.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobIdOrUrl: z.string().describe('LinkedIn job ID or full job URL')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional(),
      title: z.string().optional(),
      jobUrl: z.string().optional(),
      listDate: z.string().optional(),
      employmentType: z.string().optional(),
      seniorityLevel: z.string().optional(),
      industry: z.string().optional(),
      functions: z.array(z.string()).optional(),
      companyName: z.string().optional(),
      companyUrl: z.string().optional(),
      companyLogo: z.string().optional(),
      location: z.string().optional(),
      address: z.any().optional(),
      recruiter: z.any().optional(),
      jobDescription: z.string().optional(),
      compensationSalary: z.any().optional(),
      totalApplicants: z.number().optional(),
      raw: z.any().describe('Full raw response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getLinkedInJob({ query: ctx.input.jobIdOrUrl });

    return {
      output: {
        jobId: result.id,
        title: result.title,
        jobUrl: result.job_url,
        listDate: result.list_date,
        employmentType: result.employment_type,
        seniorityLevel: result.seniority_level,
        industry: result.industry,
        functions: result.functions,
        companyName: result.company_name,
        companyUrl: result.company_url,
        companyLogo: result.company_logo,
        location: result.location,
        address: result.address,
        recruiter: result.recruiter,
        jobDescription: result.job_description,
        compensationSalary: result.compensation_salary,
        totalApplicants: result.total_applicants,
        raw: result
      },
      message: `Retrieved LinkedIn job: **${result.title ?? 'Unknown'}** at **${result.company_name ?? 'Unknown company'}**.`
    };
  })
  .build();

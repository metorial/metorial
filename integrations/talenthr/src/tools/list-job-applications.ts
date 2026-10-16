import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let applicantSchema = z.object({
  applicantId: z.number().describe('Applicant ID'),
  firstName: z.string().describe('First name'),
  lastName: z.string().describe('Last name'),
  email: z.string().describe('Email address'),
  phone: z.string().nullable().describe('Phone number'),
  address: z.string().nullable().describe('Address'),
  createdAt: z.string().describe('Application creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp when returned by TalentHR'),
  starred: z.boolean().describe('Whether the applicant is starred'),
  applicationsCount: z
    .number()
    .optional()
    .describe('Number of applications when returned by TalentHR'),
  addedAt: z.string().describe('Date the applicant was added'),
  application: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Position-specific application details when returned')
});

export let listJobApplications = SlateTool.create(spec, {
  name: 'List Job Applications',
  key: 'list_job_applications',
  description: `List job applications (ATS applicants) from TalentHR. Optionally filter by a specific job position.
Use this to review incoming applications for open roles.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      jobPositionId: z
        .string()
        .optional()
        .describe('Job position ID from list_job_positions. Omit to list all candidates.'),
      limit: z
        .number()
        .optional()
        .default(100)
        .describe('Maximum number of applications to return'),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe('Number of records to skip for pagination'),
      search: z.string().optional().describe('Search first name, last name, or email')
    })
  )
  .output(
    z.object({
      applicants: z.array(applicantSchema).describe('List of job applicants'),
      count: z.number().describe('Number of applicants returned on this page'),
      total: z.number().optional().describe('Total matching applicants reported by TalentHR'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listJobApplications({
      jobPositionId: ctx.input.jobPositionId,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      search: ctx.input.search
    });

    let applicants = response.data.rows.map(app => ({
      applicantId: app.id,
      firstName: app.first_name,
      lastName: app.last_name,
      email: app.email,
      phone: app.phone,
      address: app.address,
      createdAt: app.created_at,
      updatedAt: app.updated_at,
      starred: app.starred,
      applicationsCount: app.applications_count,
      addedAt: app.added_at,
      application: app.application as Record<string, unknown> | undefined
    }));

    return {
      output: {
        applicants,
        count: applicants.length,
        total: response.data.total,
        rawResponse: response
      },
      message: `Retrieved **${applicants.length}** job application(s)${ctx.input.jobPositionId ? ` for position ${ctx.input.jobPositionId}` : ''}.`
    };
  })
  .build();

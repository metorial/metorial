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
  updatedAt: z.string().describe('Last update timestamp'),
  starred: z.boolean().describe('Whether the applicant is starred'),
  applicationsCount: z.number().describe('Number of applications'),
  addedAt: z.string().describe('Date the applicant was added')
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
        .describe('Filter by specific job position ID. Omit to list all applications.'),
      limit: z
        .number()
        .optional()
        .default(100)
        .describe('Maximum number of applications to return'),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      applicants: z.array(applicantSchema).describe('List of job applicants'),
      count: z.number().describe('Number of applicants returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listJobApplications({
      jobPositionId: ctx.input.jobPositionId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
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
      addedAt: app.added_at
    }));

    return {
      output: {
        applicants,
        count: applicants.length
      },
      message: `Retrieved **${applicants.length}** job application(s)${ctx.input.jobPositionId ? ` for position ${ctx.input.jobPositionId}` : ''}.`
    };
  })
  .build();

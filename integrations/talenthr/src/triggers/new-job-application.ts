import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newJobApplication = SlateTrigger.create(spec, {
  name: 'New Job Application',
  key: 'new_job_application',
  description: 'Triggers when a new job application is submitted in TalentHR.'
})
  .input(
    z.object({
      applicantId: z.number().describe('Applicant ID'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      email: z.string().describe('Email address'),
      phone: z.string().nullable().describe('Phone number'),
      address: z.string().nullable().describe('Address'),
      createdAt: z.string().describe('Application creation timestamp'),
      starred: z.boolean().describe('Whether the applicant is starred'),
      applicationsCount: z.number().describe('Number of applications'),
      addedAt: z.string().describe('Date the applicant was added')
    })
  )
  .output(
    z.object({
      applicantId: z.number().describe('Applicant ID'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      email: z.string().describe('Email address'),
      phone: z.string().nullable().describe('Phone number'),
      address: z.string().nullable().describe('Address'),
      createdAt: z.string().describe('Application creation timestamp'),
      starred: z.boolean().describe('Whether the applicant is starred'),
      applicationsCount: z.number().describe('Number of applications'),
      addedAt: z.string().describe('Date the applicant was added')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let lastId = (ctx.state as any)?.lastId ?? 0;

      let response = await client.listJobApplications({
        limit: 100,
        offset: 0
      });
      let rows = response.data.rows;

      // Sort by ID descending to get newest first
      rows.sort((a, b) => b.id - a.id);

      // Filter to only new applications since last poll
      let newRows = rows.filter(row => row.id > lastId);

      let firstRow = newRows[0];
      let updatedLastId = firstRow ? firstRow.id : lastId;

      return {
        inputs: newRows.map(row => ({
          applicantId: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          phone: row.phone,
          address: row.address,
          createdAt: row.created_at,
          starred: row.starred,
          applicationsCount: row.applications_count,
          addedAt: row.added_at
        })),
        updatedState: {
          lastId: updatedLastId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'job_application.submitted',
        id: String(ctx.input.applicantId),
        output: {
          applicantId: ctx.input.applicantId,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          email: ctx.input.email,
          phone: ctx.input.phone,
          address: ctx.input.address,
          createdAt: ctx.input.createdAt,
          starred: ctx.input.starred,
          applicationsCount: ctx.input.applicationsCount,
          addedAt: ctx.input.addedAt
        }
      };
    }
  })
  .build();

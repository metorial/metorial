import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newEmployee = SlateTrigger.create(spec, {
  name: 'New Employee Created',
  key: 'new_employee',
  description: 'Triggers when a new employee is created in TalentHR.'
})
  .input(
    z.object({
      employeeId: z.number().describe('Employee ID'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      email: z.string().describe('Email address'),
      hireDate: z.string().describe('Hire date'),
      employmentStatusName: z.string().describe('Employment status'),
      department: z.string().nullable().describe('Department name'),
      division: z.string().nullable().describe('Division name'),
      jobTitle: z.string().nullable().describe('Job title'),
      location: z.string().nullable().describe('Location name'),
      role: z.string().describe('User role name')
    })
  )
  .output(
    z.object({
      employeeId: z.number().describe('Employee ID'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      email: z.string().describe('Email address'),
      hireDate: z.string().describe('Hire date'),
      employmentStatusName: z.string().describe('Employment status'),
      department: z.string().nullable().describe('Department name'),
      division: z.string().nullable().describe('Division name'),
      jobTitle: z.string().nullable().describe('Job title'),
      location: z.string().nullable().describe('Location name'),
      role: z.string().describe('User role name')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let lastId = (ctx.state as any)?.lastId ?? 0;

      let response = await client.listEmployees({ limit: 100, offset: 0 });
      let rows = response.data.rows;

      // Sort by ID descending to get newest first
      rows.sort((a, b) => b.id - a.id);

      // Filter to only new employees since last poll
      let newRows = rows.filter(row => row.id > lastId);

      let firstRow = newRows[0];
      let updatedLastId = firstRow ? firstRow.id : lastId;

      return {
        inputs: newRows.map(row => ({
          employeeId: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          hireDate: row.hire_date,
          employmentStatusName: row.employment_status_name,
          department: row.department,
          division: row.division,
          jobTitle: row.job_title,
          location: row.location,
          role: row.user_role.name
        })),
        updatedState: {
          lastId: updatedLastId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'employee.created',
        id: String(ctx.input.employeeId),
        output: {
          employeeId: ctx.input.employeeId,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          email: ctx.input.email,
          hireDate: ctx.input.hireDate,
          employmentStatusName: ctx.input.employmentStatusName,
          department: ctx.input.department,
          division: ctx.input.division,
          jobTitle: ctx.input.jobTitle,
          location: ctx.input.location,
          role: ctx.input.role
        }
      };
    }
  })
  .build();

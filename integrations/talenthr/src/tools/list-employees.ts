import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let employeeSchema = z.object({
  employeeId: z.number().describe('Employee ID'),
  userId: z.number().describe('User ID'),
  firstName: z.string().describe('First name'),
  lastName: z.string().describe('Last name'),
  email: z.string().describe('Email address'),
  divisionId: z.number().nullable().describe('Division ID'),
  division: z.string().nullable().describe('Division name'),
  employmentStatusId: z.number().describe('Employment status ID'),
  employmentStatusName: z.string().describe('Employment status name'),
  departmentId: z.number().nullable().describe('Department ID'),
  department: z.string().nullable().describe('Department name'),
  jobTitleId: z.number().nullable().describe('Job title ID'),
  jobTitle: z.string().nullable().describe('Job title'),
  locationId: z.number().nullable().describe('Location ID'),
  location: z.string().nullable().describe('Location name'),
  terminationDate: z.string().nullable().describe('Termination date'),
  hireDate: z.string().describe('Hire date'),
  reportsToEmployeeId: z.number().nullable().describe('Manager employee ID'),
  photoUrl: z.string().nullable().describe('Profile photo URL'),
  role: z.string().describe('User role name')
});

export let listEmployees = SlateTool.create(spec, {
  name: 'List Employees',
  key: 'list_employees',
  description: `Retrieve the employee directory from TalentHR. Returns a paginated list of employees with their basic profile, job assignment, and organizational details.
Use this to browse the workforce, find specific employees, or get an overview of the organization.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .default(100)
        .describe('Maximum number of employees to return (default 100)'),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      employees: z.array(employeeSchema).describe('List of employees'),
      count: z.number().describe('Number of employees returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listEmployees({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let employees = response.data.rows.map(emp => ({
      employeeId: emp.id,
      userId: emp.user_id,
      firstName: emp.first_name,
      lastName: emp.last_name,
      email: emp.email,
      divisionId: emp.division_id,
      division: emp.division,
      employmentStatusId: emp.employment_status_id,
      employmentStatusName: emp.employment_status_name,
      departmentId: emp.department_id,
      department: emp.department,
      jobTitleId: emp.job_title_id,
      jobTitle: emp.job_title,
      locationId: emp.location_id,
      location: emp.location,
      terminationDate: emp.termination_date,
      hireDate: emp.hire_date,
      reportsToEmployeeId: emp.reports_to_employee_id,
      photoUrl: emp.photo_url,
      role: emp.user_role.name
    }));

    return {
      output: {
        employees,
        count: employees.length
      },
      message: `Retrieved **${employees.length}** employee(s) from the directory.`
    };
  })
  .build();

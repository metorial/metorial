import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEmployee = SlateTool.create(spec, {
  name: 'Create Employee',
  key: 'create_employee',
  description: `Create a new employee record in BambooHR. At minimum, first name and last name are required. You can include additional fields like email, job title, department, hire date, and any other standard or custom fields.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('Employee first name'),
      lastName: z.string().describe('Employee last name'),
      workEmail: z.string().optional().describe('Work email address'),
      jobTitle: z.string().optional().describe('Job title'),
      department: z.string().optional().describe('Department name'),
      division: z.string().optional().describe('Division name'),
      location: z.string().optional().describe('Work location'),
      hireDate: z.string().optional().describe('Hire date in YYYY-MM-DD format'),
      additionalFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional fields as key-value pairs (field name to value)')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('The ID of the newly created employee'),
      location: z.string().optional().describe('The URL/location of the new employee resource')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    let employeeData: Record<string, any> = {
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName
    };

    if (ctx.input.workEmail) employeeData.workEmail = ctx.input.workEmail;
    if (ctx.input.jobTitle) employeeData.jobTitle = ctx.input.jobTitle;
    if (ctx.input.department) employeeData.department = ctx.input.department;
    if (ctx.input.division) employeeData.division = ctx.input.division;
    if (ctx.input.location) employeeData.location = ctx.input.location;
    if (ctx.input.hireDate) employeeData.hireDate = ctx.input.hireDate;

    if (ctx.input.additionalFields) {
      for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
        employeeData[key] = value;
      }
    }

    let result = await client.addEmployee(employeeData);

    // BambooHR returns the location header with the new employee URL
    let employeeId = result?.id || result?.headers?.location?.split('/').pop() || 'unknown';

    return {
      output: {
        employeeId: String(employeeId),
        location: result?.headers?.location
      },
      message: `Created employee **${ctx.input.firstName} ${ctx.input.lastName}** with ID **${employeeId}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { RipplingClient } from '../lib/client';
import { spec } from '../spec';

export let getEmployee = SlateTool.create(spec, {
  name: 'Get Employee',
  key: 'get_employee',
  description: `Retrieve detailed information about a specific employee by their ID. Returns comprehensive employee data including name, email, title, department, employment status, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('The unique identifier of the employee to retrieve')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('Unique employee identifier'),
      name: z.string().optional().describe('Full name of the employee'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      workEmail: z.string().optional().describe('Work email address'),
      personalEmail: z.string().optional().describe('Personal email address'),
      employmentType: z.string().optional().describe('Employment type'),
      title: z.string().optional().describe('Job title'),
      department: z.string().optional().describe('Department'),
      roleState: z.string().optional().describe('Role state (e.g. Active, Terminated)'),
      startDate: z.string().optional().describe('Employment start date'),
      endDate: z.string().optional().describe('Employment end date'),
      phone: z.string().optional().describe('Phone number'),
      workLocation: z.any().optional().describe('Work location details'),
      isManager: z.boolean().optional().describe('Whether the employee is a manager'),
      uniqueId: z.string().optional().describe('Permanent unique profile number'),
      compensation: z.any().optional().describe('Compensation details'),
      customFields: z.any().optional().describe('Custom fields defined for this employee')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RipplingClient({ token: ctx.auth.token });
    let emp = await client.getEmployee(ctx.input.employeeId);

    return {
      output: {
        employeeId: emp.id || emp.roleId || ctx.input.employeeId,
        name: emp.name,
        firstName: emp.firstName,
        lastName: emp.lastName,
        workEmail: emp.workEmail,
        personalEmail: emp.personalEmail,
        employmentType: emp.employmentType,
        title: emp.title,
        department: emp.department,
        roleState: emp.roleState,
        startDate: emp.startDate,
        endDate: emp.endDate,
        phone: emp.phone || emp.phoneNumber,
        workLocation: emp.workLocation,
        isManager: emp.isManager,
        uniqueId: emp.uniqueId,
        compensation: emp.compensation,
        customFields: emp.customFields
      },
      message: `Retrieved employee **${emp.name || `${emp.firstName} ${emp.lastName}` || ctx.input.employeeId}** (${emp.roleState || 'Unknown status'}).`
    };
  })
  .build();

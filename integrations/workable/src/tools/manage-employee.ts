import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { spec } from '../spec';

export let manageEmployeeTool = SlateTool.create(spec, {
  name: 'Manage Employee',
  key: 'manage_employee',
  description: `Get, create, or update an employee record in Workable HR. Use action "get" to fetch full employee details and documents, "create" to add a new employee, or "update" to modify an existing employee record.`,
  instructions: [
    'Use action "get" with an employeeId to retrieve complete employee information and optionally their documents',
    'Use action "create" to add a new employee — firstname, lastname, and workEmail are required',
    'Use action "update" to modify employee fields — provide the employeeId and any fields to change'
  ]
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update']).describe('The action to perform'),
      employeeId: z
        .string()
        .optional()
        .describe('Employee ID (required for "get" and "update")'),
      includeDocuments: z
        .boolean()
        .optional()
        .describe('Include documents when getting employee details'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      workEmail: z.string().optional().describe('Work email address'),
      email: z.string().optional().describe('Personal email'),
      phone: z.string().optional().describe('Phone number'),
      jobTitle: z.string().optional().describe('Job title'),
      department: z.string().optional().describe('Department'),
      startDate: z.string().optional().describe('Start date (ISO 8601)'),
      managerId: z.string().optional().describe('Manager employee ID'),
      employmentType: z.string().optional().describe('Employment type')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('Employee ID'),
      name: z.string().optional().describe('Full name'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Personal email'),
      workEmail: z.string().optional().describe('Work email'),
      phone: z.string().optional().describe('Phone number'),
      department: z.string().optional().describe('Department'),
      jobTitle: z.string().optional().describe('Job title'),
      status: z.string().optional().describe('Employee status'),
      startDate: z.string().optional().describe('Start date'),
      managerId: z.string().optional().describe('Manager ID'),
      employmentType: z.string().optional().describe('Employment type'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      documents: z
        .array(
          z.object({
            documentId: z.string().optional(),
            name: z.string().optional(),
            type: z.string().optional(),
            url: z.string().optional()
          })
        )
        .optional()
        .describe('Employee documents'),
      actionPerformed: z.string().describe('Description of the action taken')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let mapEmployee = (e: any) => ({
      employeeId: e.id,
      name: e.name,
      firstname: e.firstname,
      lastname: e.lastname,
      email: e.email,
      workEmail: e.work_email,
      phone: e.phone,
      department: e.department,
      jobTitle: e.job_title,
      status: e.status,
      startDate: e.start_date,
      managerId: e.manager_id,
      employmentType: e.employment_type,
      createdAt: e.created_at
    });

    switch (ctx.input.action) {
      case 'get': {
        if (!ctx.input.employeeId) throw new Error('employeeId is required for get action');
        let result = await client.getEmployee(ctx.input.employeeId);
        let emp = result.employee || result;
        let output: any = { ...mapEmployee(emp), actionPerformed: 'Retrieved employee' };

        if (ctx.input.includeDocuments) {
          let docsResult = await client.getEmployeeDocuments(ctx.input.employeeId);
          output.documents = (docsResult.documents || []).map((d: any) => ({
            documentId: d.id,
            name: d.name,
            type: d.type,
            url: d.url
          }));
        }

        return {
          output,
          message: `Retrieved employee **"${output.name || output.firstname}"** (${output.employeeId}).`
        };
      }
      case 'create': {
        let payload: any = {
          firstname: ctx.input.firstname,
          lastname: ctx.input.lastname,
          work_email: ctx.input.workEmail,
          email: ctx.input.email,
          phone: ctx.input.phone,
          job_title: ctx.input.jobTitle,
          department: ctx.input.department,
          start_date: ctx.input.startDate,
          manager_id: ctx.input.managerId,
          employment_type: ctx.input.employmentType
        };

        // Remove undefined values
        Object.keys(payload).forEach(key => {
          if (payload[key] === undefined) delete payload[key];
        });

        let result = await client.createEmployee(payload);
        let emp = result.employee || result;

        return {
          output: { ...mapEmployee(emp), actionPerformed: 'Created employee' },
          message: `Created employee **"${ctx.input.firstname} ${ctx.input.lastname}"** (${emp.id}).`
        };
      }
      case 'update': {
        if (!ctx.input.employeeId) throw new Error('employeeId is required for update action');
        let payload: any = {};
        if (ctx.input.firstname !== undefined) payload.firstname = ctx.input.firstname;
        if (ctx.input.lastname !== undefined) payload.lastname = ctx.input.lastname;
        if (ctx.input.workEmail !== undefined) payload.work_email = ctx.input.workEmail;
        if (ctx.input.email !== undefined) payload.email = ctx.input.email;
        if (ctx.input.phone !== undefined) payload.phone = ctx.input.phone;
        if (ctx.input.jobTitle !== undefined) payload.job_title = ctx.input.jobTitle;
        if (ctx.input.department !== undefined) payload.department = ctx.input.department;
        if (ctx.input.startDate !== undefined) payload.start_date = ctx.input.startDate;
        if (ctx.input.managerId !== undefined) payload.manager_id = ctx.input.managerId;
        if (ctx.input.employmentType !== undefined)
          payload.employment_type = ctx.input.employmentType;

        let result = await client.updateEmployee(ctx.input.employeeId, payload);
        let emp = result.employee || result;

        return {
          output: { ...mapEmployee(emp), actionPerformed: 'Updated employee' },
          message: `Updated employee **${ctx.input.employeeId}**.`
        };
      }
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();

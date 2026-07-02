import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { requireWorkableString } from '../lib/errors';
import {
  buildEmployeeBody,
  mapEmployee,
  mapEmployeeDocument,
  unwrapEmployee
} from '../lib/shapes';
import { spec } from '../spec';

let allowedEmployeeDocumentLimits = [10, 20];

export let manageEmployeeTool = SlateTool.create(spec, {
  name: 'Manage Employee',
  key: 'manage_employee',
  description: `Get, create, or update a Workable HR employee. Create and update requests are wrapped in Workable's documented { employee } payload, with optional memberId for account-token access.`,
  instructions: [
    'Use "get" with employeeId to retrieve employee information and optionally documents.',
    'Use "create" with employee fields and optional state draft/published.',
    'Use "update" with employeeId and any fields to change.'
  ]
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update']).describe('The action to perform'),
      employeeId: z.string().optional().describe('Employee ID required for get and update'),
      memberId: z
        .string()
        .optional()
        .describe('Member ID required for some account-token employee operations'),
      includeDocuments: z
        .boolean()
        .optional()
        .describe('Include documents when getting employee details'),
      documentType: z
        .enum([
          'simple_employee_document',
          'signature_request_employee_document',
          'timeoff_attachment',
          'i_9_form_document'
        ])
        .optional()
        .describe('Document type filter'),
      documentLimit: z
        .number()
        .optional()
        .describe('Maximum documents to return. Workable accepts 10 or 20.'),
      documentOffset: z.number().optional().describe('Document pagination offset'),
      state: z.enum(['draft', 'published']).optional().describe('Employee state for create'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      workEmail: z.string().optional().describe('Work email address'),
      email: z.string().optional().describe('Personal email'),
      phone: z.string().optional().describe('Phone number'),
      jobTitle: z.string().optional().describe('Job title'),
      department: z.string().optional().describe('Department name'),
      departmentId: z.string().optional().describe('Department ID'),
      startDate: z.string().optional().describe('Start date'),
      reportsTo: z.string().optional().describe('Reports-to value accepted by Workable'),
      managerId: z.string().optional().describe('Manager employee ID'),
      legalEntity: z.string().optional().describe('Legal entity value accepted by Workable'),
      legalEntityId: z.string().optional().describe('Legal entity ID'),
      workSchedule: z.string().optional().describe('Work schedule value accepted by Workable'),
      workScheduleId: z.string().optional().describe('Work schedule ID'),
      employmentType: z.string().optional().describe('Employment type'),
      employeeNumber: z.string().optional().describe('Employee number'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Employee custom fields in Workable API shape')
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
      departmentId: z.string().optional().describe('Department ID'),
      jobTitle: z.string().optional().describe('Job title'),
      state: z.string().optional().describe('Employee state'),
      status: z.string().optional().describe('Employee status/state'),
      startDate: z.string().optional().describe('Start date'),
      managerId: z.string().optional().describe('Manager ID'),
      legalEntityId: z.string().optional().describe('Legal entity ID'),
      workScheduleId: z.string().optional().describe('Work schedule ID'),
      employmentType: z.string().optional().describe('Employment type'),
      employeeNumber: z.string().optional().describe('Employee number'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Update timestamp'),
      documents: z.array(z.any()).optional().describe('Employee document metadata'),
      documentsTotalCount: z.number().optional().describe('Total employee document count'),
      actionPerformed: z.string().describe('Description of the action taken')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    switch (ctx.input.action) {
      case 'get': {
        let employeeId = requireWorkableString(ctx.input.employeeId, 'employeeId', 'get');
        let result = await client.getEmployee(employeeId, {
          member_id: ctx.input.memberId
        });
        let output: any = {
          ...mapEmployee(unwrapEmployee(result)),
          actionPerformed: 'Retrieved employee'
        };

        if (ctx.input.includeDocuments) {
          if (
            ctx.input.documentLimit !== undefined &&
            !allowedEmployeeDocumentLimits.includes(ctx.input.documentLimit)
          ) {
            throw createApiServiceError('documentLimit must be one of 10 or 20.');
          }

          let docsResult = await client.getEmployeeDocuments(employeeId, {
            member_id: ctx.input.memberId,
            type: ctx.input.documentType,
            limit: ctx.input.documentLimit,
            offset: ctx.input.documentOffset
          });
          output.documents = (docsResult.employee_documents || docsResult.documents || []).map(
            mapEmployeeDocument
          );
          output.documentsTotalCount = docsResult.total_count ?? docsResult.totalCount;
        }

        return {
          output,
          message: `Retrieved employee **"${output.name || output.firstname || output.employeeId}"**.`
        };
      }
      case 'create': {
        if (!ctx.input.firstname) {
          throw createApiServiceError('firstname is required for create.');
        }
        if (!ctx.input.lastname) {
          throw createApiServiceError('lastname is required for create.');
        }
        if (!ctx.input.workEmail) {
          throw createApiServiceError('workEmail is required for create.');
        }

        let result = await client.createEmployee(buildEmployeeBody(ctx.input));
        let employee = unwrapEmployee(result);

        return {
          output: {
            ...mapEmployee(employee),
            actionPerformed: 'Created employee'
          },
          message: `Created employee **"${employee.name || `${ctx.input.firstname} ${ctx.input.lastname}`}"**.`
        };
      }
      case 'update': {
        let employeeId = requireWorkableString(ctx.input.employeeId, 'employeeId', 'update');
        let body = buildEmployeeBody(ctx.input);
        if (!body.employee || Object.keys(body.employee).length === 0) {
          throw createApiServiceError('Provide at least one employee field for update.');
        }

        let result = await client.updateEmployee(employeeId, body);
        let employee = unwrapEmployee(result);

        return {
          output: {
            ...mapEmployee(employee),
            actionPerformed: 'Updated employee'
          },
          message: `Updated employee **${employeeId}**.`
        };
      }
    }
  })
  .build();

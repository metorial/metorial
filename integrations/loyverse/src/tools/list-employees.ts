import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let employeeSchema = z.object({
  employeeId: z.string().describe('Employee ID'),
  employeeName: z.string().optional().describe('Employee name'),
  email: z.string().nullable().optional().describe('Email'),
  phoneNumber: z.string().nullable().optional().describe('Phone number'),
  role: z.string().nullable().optional().describe('Employee role'),
  storeIds: z.array(z.string()).optional().describe('Assigned store IDs'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional()
});

export let listEmployees = SlateTool.create(spec, {
  name: 'List Employees',
  key: 'list_employees',
  description: `Retrieve employee records. Employees can only be read via the API; create/update/delete operations must be done through the Loyverse Back Office.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().min(1).max(250).optional(),
      cursor: z.string().optional()
    })
  )
  .output(
    z.object({
      employees: z.array(employeeSchema),
      cursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listEmployees({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let employees = (result.employees ?? []).map((e: any) => ({
      employeeId: e.id,
      employeeName: e.name,
      email: e.email,
      phoneNumber: e.phone_number,
      role: e.role,
      storeIds: e.stores,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
      deletedAt: e.deleted_at
    }));

    return {
      output: { employees, cursor: result.cursor },
      message: `Retrieved **${employees.length}** employee(s).`
    };
  })
  .build();

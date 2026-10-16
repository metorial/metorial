import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, joinIds } from '../lib/client';
import { spec } from '../spec';

let employeeSchema = z.object({
  employeeId: z.string().describe('Employee ID'),
  employeeName: z.string().optional().describe('Employee name'),
  email: z.string().nullable().optional().describe('Email'),
  phoneNumber: z.string().nullable().optional().describe('Phone number'),
  role: z
    .string()
    .nullable()
    .optional()
    .describe('Employee role, when provided (OWNER for the account owner)'),
  isOwner: z.boolean().nullable().optional().describe('Whether this is the account owner'),
  storeIds: z.array(z.string()).optional().describe('Store IDs the employee can access'),
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
      employeeIds: z
        .array(z.string())
        .optional()
        .describe('Only return employees with these IDs'),
      createdAtMin: z
        .string()
        .optional()
        .describe('Only return employees created at or after this ISO 8601 UTC timestamp'),
      createdAtMax: z
        .string()
        .optional()
        .describe('Only return employees created at or before this ISO 8601 UTC timestamp'),
      updatedAtMin: z
        .string()
        .optional()
        .describe('Only return employees updated at or after this ISO 8601 UTC timestamp'),
      updatedAtMax: z
        .string()
        .optional()
        .describe('Only return employees updated at or before this ISO 8601 UTC timestamp'),
      limit: z.number().min(1).max(250).optional().describe('Number of employees to return'),
      cursor: z.string().optional().describe('Pagination cursor'),
      showDeleted: z.boolean().optional().describe('Include deleted employees')
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
      employeeIds: joinIds(ctx.input.employeeIds),
      createdAtMin: ctx.input.createdAtMin,
      createdAtMax: ctx.input.createdAtMax,
      updatedAtMin: ctx.input.updatedAtMin,
      updatedAtMax: ctx.input.updatedAtMax,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      showDeleted: ctx.input.showDeleted
    });

    let employees = (result.employees ?? []).map((e: any) => ({
      employeeId: e.id,
      employeeName: e.name,
      email: e.email,
      phoneNumber: e.phone_number,
      role: e.role ?? (e.is_owner ? 'OWNER' : undefined),
      isOwner: e.is_owner,
      storeIds: e.stores ?? undefined,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
      deletedAt: e.deleted_at
    }));

    return {
      output: { employees, cursor: result.cursor },
      message: `Retrieved **${employees.length}** employee(s).${result.cursor ? ' More available via cursor.' : ''}`
    };
  })
  .build();

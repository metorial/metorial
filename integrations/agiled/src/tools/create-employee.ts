import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEmployee = SlateTool.create(spec, {
  name: 'Create Employee',
  key: 'create_employee',
  description: `Create a new employee record in Agiled. Add employee details like name, email, department, and designation for HR management.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Employee full name'),
      email: z.string().describe('Employee email address'),
      designation: z.string().optional().describe('Job title or designation'),
      departmentId: z.string().optional().describe('Department ID to assign the employee to'),
      joiningDate: z.string().optional().describe('Date of joining (YYYY-MM-DD)'),
      phone: z.string().optional().describe('Phone number'),
      address: z.string().optional().describe('Address')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('ID of the created employee'),
      name: z.string().describe('Employee name'),
      email: z.string().optional().describe('Employee email')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    let result = await client.createEmployee({
      name: ctx.input.name,
      email: ctx.input.email,
      designation: ctx.input.designation,
      department_id: ctx.input.departmentId,
      joining_date: ctx.input.joiningDate,
      phone: ctx.input.phone,
      address: ctx.input.address
    });

    let employee = result.data;

    return {
      output: {
        employeeId: String(employee.id ?? ''),
        name: String(employee.name ?? ctx.input.name),
        email: (employee.email as string | undefined) ?? ctx.input.email
      },
      message: `Created employee **${ctx.input.name}** (${ctx.input.email}).`
    };
  })
  .build();

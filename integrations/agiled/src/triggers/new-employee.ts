import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newEmployeeTrigger = SlateTrigger.create(spec, {
  name: 'New Employee',
  key: 'new_employee',
  description: 'Triggers when a new employee is created in Agiled.'
})
  .input(
    z.object({
      employeeId: z.string().describe('ID of the employee'),
      employee: z.record(z.string(), z.unknown()).describe('Employee record from Agiled')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('ID of the new employee'),
      name: z.string().optional().describe('Employee name'),
      email: z.string().optional().describe('Employee email'),
      designation: z.string().optional().describe('Job designation'),
      departmentId: z.string().optional().describe('Department ID'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        brand: ctx.auth.brand
      });

      let lastKnownId = (ctx.state as Record<string, unknown>)?.lastKnownId as
        | number
        | undefined;

      let result = await client.listEmployees(1, 50);
      let employees = result.data;

      let newEmployees = lastKnownId ? employees.filter(e => Number(e.id) > lastKnownId) : [];

      let maxId = employees.reduce(
        (max, e) => Math.max(max, Number(e.id) || 0),
        lastKnownId ?? 0
      );

      return {
        inputs: newEmployees.map(e => ({
          employeeId: String(e.id),
          employee: e
        })),
        updatedState: {
          lastKnownId: maxId
        }
      };
    },

    handleEvent: async ctx => {
      let e = ctx.input.employee;
      return {
        type: 'employee.created',
        id: ctx.input.employeeId,
        output: {
          employeeId: ctx.input.employeeId,
          name: e.name as string | undefined,
          email: e.email as string | undefined,
          designation: e.designation as string | undefined,
          departmentId: e.department_id != null ? String(e.department_id) : undefined,
          createdAt: e.created_at as string | undefined
        }
      };
    }
  })
  .build();

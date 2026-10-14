import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getEmployeeRecord } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    "Identify the employee who owns the connected DeskTime API key. Returns their ID, name, email, and today's tracking information.",
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.union([z.string(), z.number()]).describe('Employee ID of the connected user'),
      name: z.string().optional().describe('Employee name'),
      email: z.string().optional().describe('Employee email address'),
      employee: z
        .record(z.string(), z.unknown())
        .describe("Employee details and today's tracking information"),
      rawResponse: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let response = await new Client({ token: ctx.auth.token }).getCurrentUser();
    let employee = getEmployeeRecord(response);
    if (typeof employee.id !== 'string' && typeof employee.id !== 'number') {
      throw createApiServiceError('DeskTime did not return the connected employee ID.', {
        reason: 'desktime_invalid_response'
      });
    }
    return {
      output: {
        userId: employee.id,
        name: typeof employee.name === 'string' ? employee.name : undefined,
        email: typeof employee.email === 'string' ? employee.email : undefined,
        employee,
        rawResponse: response
      },
      message: `Connected as **${employee.name || employee.email || employee.id}**.`
    };
  })
  .build();

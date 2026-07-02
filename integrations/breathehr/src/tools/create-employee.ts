import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEmployee = SlateTool.create(spec, {
  name: 'Create Employee',
  key: 'create_employee',
  description: `Create a new employee record in Breathe HR. Provide personal information such as name and email, along with employment details like job title, department, and join date.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('Employee first name'),
      lastName: z.string().describe('Employee last name'),
      email: z.string().optional().describe('Employee email address'),
      jobTitle: z.string().optional().describe('Job title'),
      joinDate: z.string().optional().describe('Company join date (format: YYYY/MM/DD)'),
      dob: z.string().optional().describe('Date of birth (format: YYYY/MM/DD)'),
      gender: z.string().optional().describe('Gender'),
      knownAs: z.string().optional().describe('Known-as / preferred name'),
      lineManagerId: z.string().optional().describe('ID of the line manager'),
      departmentId: z.string().optional().describe('ID of the department'),
      divisionId: z.string().optional().describe('ID of the division'),
      locationId: z.string().optional().describe('ID of the location'),
      workingPatternId: z.string().optional().describe('ID of the working pattern'),
      holidayAllowanceId: z.string().optional().describe('ID of the holiday allowance')
    })
  )
  .output(
    z.object({
      employee: z.record(z.string(), z.any()).describe('The created employee record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.createEmployee(ctx.input);

    let employee = result?.employees?.[0] || result?.employee || result;

    return {
      output: { employee },
      message: `Created employee **${ctx.input.firstName} ${ctx.input.lastName}** (ID: ${employee?.id || 'unknown'}).`
    };
  })
  .build();

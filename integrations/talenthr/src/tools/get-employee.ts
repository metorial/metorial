import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getEmployee = SlateTool.create(spec, {
  key: 'get_employee',
  name: 'Get Employee',
  description:
    'Get a detailed TalentHR employee profile by an employee ID from list_employees. Includes personal details, job relationships, custom fields, and contact information available to the API key.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ employeeId: z.string().describe('Employee ID from list_employees') }))
  .output(
    z.object({
      employeeId: z.number().describe('Employee ID'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      email: z.string().describe('Work email address'),
      profile: z
        .record(z.string(), z.unknown())
        .describe('Complete employee profile returned by TalentHR'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    const profile = await new Client({ token: ctx.auth.token }).getEmployee(
      ctx.input.employeeId
    );
    return {
      output: {
        employeeId: profile.id,
        firstName: profile.user.first_name,
        lastName: profile.user.last_name,
        email: profile.user.email,
        profile,
        rawResponse: profile
      },
      message: `Retrieved employee ${profile.id}.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fail, readOne, requireDate, requireId, requireText } from '../lib/response';
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
      email: z
        .string()
        .optional()
        .describe('Employee email address; required by the current creation endpoint'),
      jobTitle: z.string().optional().describe('Job title'),
      joinDate: z
        .string()
        .optional()
        .describe('Required company join date (format: YYYY-MM-DD or YYYY/MM/DD)'),
      dob: z.string().optional().describe('Date of birth (format: YYYY-MM-DD or YYYY/MM/DD)'),
      gender: z.string().optional().describe('Gender'),
      knownAs: z
        .string()
        .optional()
        .describe(
          'Legacy field unsupported by current creation; omit and configure it in the account'
        ),
      lineManagerId: z
        .string()
        .optional()
        .describe(
          'Legacy field unsupported by current creation; omit and configure it in the account'
        ),
      departmentId: z.string().optional().describe('ID of the department'),
      divisionId: z.string().optional().describe('ID of the division'),
      locationId: z.string().optional().describe('ID of the location'),
      workingPatternId: z.string().optional().describe('ID of the working pattern'),
      holidayAllowanceId: z.string().optional().describe('ID of the holiday allowance')
    })
  )
  .output(
    z.object({
      employee: z.record(z.string(), z.unknown()).describe('The created employee record')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.knownAs !== undefined || ctx.input.lineManagerId !== undefined)
      fail(
        'The current employee creation endpoint does not document knownAs or lineManagerId. Omit these legacy fields and configure them through an authorized account workflow.'
      );
    const email = requireText(ctx.input.email, 'employee email');
    if (!z.email().safeParse(email).success) fail('Provide a valid employee email address.');
    const employee = readOne(
      await new Client({ token: ctx.auth.token, environment: ctx.config.environment }).create(
        'employees',
        'employee',
        {
          first_name: requireText(ctx.input.firstName, 'firstName'),
          last_name: requireText(ctx.input.lastName, 'lastName'),
          email,
          company_join_date: requireDate(ctx.input.joinDate, 'joinDate'),
          job_title: ctx.input.jobTitle,
          dob: ctx.input.dob === undefined ? undefined : requireDate(ctx.input.dob, 'dob'),
          gender: ctx.input.gender,
          department:
            ctx.input.departmentId === undefined
              ? undefined
              : requireId(ctx.input.departmentId, 'departmentId'),
          division:
            ctx.input.divisionId === undefined
              ? undefined
              : requireId(ctx.input.divisionId, 'divisionId'),
          location:
            ctx.input.locationId === undefined
              ? undefined
              : requireId(ctx.input.locationId, 'locationId'),
          working_pattern_id:
            ctx.input.workingPatternId === undefined
              ? undefined
              : requireId(ctx.input.workingPatternId, 'workingPatternId'),
          holiday_allowance_id:
            ctx.input.holidayAllowanceId === undefined
              ? undefined
              : requireId(ctx.input.holidayAllowanceId, 'holidayAllowanceId')
        }
      ),
      'employees'
    );
    return {
      output: { employee },
      message: 'Created the employee record. Personnel history may be retained.'
    };
  })
  .build();

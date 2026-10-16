import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, providerId, validateDate, validateText } from '../lib/client';
import { spec } from '../spec';

export let hireEmployee = SlateTool.create(spec, {
  name: 'Hire Employee',
  key: 'hire_employee',
  description: `Hire a new employee and register them in the TalentHR system. Creates the employee record with their personal details, job assignment, compensation, and optionally triggers the onboarding process.
Use this to onboard new hires into the organization with their department, division, job title, location, and pay details.`,
  instructions: [
    'The hireDate must be formatted as YYYY-MM-DD.',
    'The payRate must have exactly 2 decimal places, e.g. 1255.38.',
    'Set preventEmail to true to skip sending the invitation email to the new employee.',
    'Set isExisting to true if adding an existing employee (skips automatic onboarding).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('First name of the new employee'),
      lastName: z.string().describe('Last name of the new employee'),
      email: z.string().describe('Work email address of the new employee'),
      hireDate: z.string().describe('Hire date in YYYY-MM-DD format'),
      employmentStatusId: z
        .string()
        .describe('Employment status ID from list_organizational_structure'),
      reportsToEmployeeId: z
        .string()
        .optional()
        .describe('Employee ID of the manager this employee reports to'),
      jobTitleId: z.string().optional().describe('Job title ID to assign'),
      locationId: z.string().optional().describe('Job location ID'),
      divisionId: z.string().optional().describe('Division ID'),
      departmentId: z.string().optional().describe('Department ID'),
      payRate: z
        .number()
        .optional()
        .describe('Employee wage with 2 decimal places, e.g. 1255.38'),
      payRatePeriod: z
        .enum(['hour', 'day', 'week', 'month', 'quarter', 'year'])
        .optional()
        .describe('Period over which pay rate is earned'),
      payRateSchedule: z
        .enum(['once-per-month', 'twice-per-month', 'every-other-week'])
        .optional()
        .describe('Frequency of wage payments'),
      overtimeStatus: z
        .enum(['exempt', 'non-exempt'])
        .optional()
        .describe('Whether the employee is exempt or non-exempt from overtime'),
      preventEmail: z
        .boolean()
        .optional()
        .describe('Set to true to skip sending invitation email'),
      isExisting: z
        .boolean()
        .optional()
        .describe('Set to true if adding an existing employee (skips onboarding)'),
      hirePacketWhoId: z
        .number()
        .optional()
        .describe('Employee ID of person who will meet the new hire'),
      hirePacketAddress: z
        .string()
        .optional()
        .describe('Address where the onboarding meeting takes place'),
      hirePacketWhenTime: z
        .string()
        .optional()
        .describe('Meeting datetime in YYYY-MM-DD HH:mm format'),
      hirePacketInstructions: z
        .string()
        .optional()
        .describe('Important instructions for the newly hired employee')
    })
  )
  .output(
    z.object({
      employeeId: z.number().describe('ID of the newly created employee'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    validateText(ctx.input.firstName, 'firstName', 191);
    validateText(ctx.input.lastName, 'lastName', 191);
    validateText(ctx.input.email, 'email', 191);
    if (!z.email().safeParse(ctx.input.email).success)
      throw createApiServiceError('email must be a valid email address.');
    validateDate(ctx.input.hireDate, 'hireDate');
    if (
      ctx.input.payRate !== undefined &&
      (!Number.isFinite(ctx.input.payRate) ||
        ctx.input.payRate < 0 ||
        Math.abs(ctx.input.payRate * 100 - Math.round(ctx.input.payRate * 100)) > 0.000001)
    ) {
      throw createApiServiceError(
        'payRate must be nonnegative with at most two decimal places.'
      );
    }
    const meetingFields = [
      ctx.input.hirePacketWhoId,
      ctx.input.hirePacketAddress,
      ctx.input.hirePacketWhenTime
    ];
    if (
      meetingFields.some(value => value !== undefined) &&
      meetingFields.some(value => value === undefined)
    ) {
      throw createApiServiceError(
        'Provide hirePacketWhoId, hirePacketAddress, and hirePacketWhenTime together.'
      );
    }
    if (ctx.input.hirePacketWhoId !== undefined)
      providerId(ctx.input.hirePacketWhoId, 'hirePacketWhoId');
    if (ctx.input.hirePacketAddress !== undefined)
      validateText(ctx.input.hirePacketAddress, 'hirePacketAddress', 20000);
    if (ctx.input.hirePacketInstructions !== undefined)
      validateText(ctx.input.hirePacketInstructions, 'hirePacketInstructions', 250);
    if (ctx.input.hirePacketWhenTime !== undefined) {
      if (
        !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(ctx.input.hirePacketWhenTime) ||
        Number(ctx.input.hirePacketWhenTime.slice(11, 13)) > 23 ||
        Number(ctx.input.hirePacketWhenTime.slice(14)) > 59
      )
        throw createApiServiceError('hirePacketWhenTime must use YYYY-MM-DD HH:mm.');
      validateDate(ctx.input.hirePacketWhenTime.slice(0, 10), 'hirePacketWhenTime');
    }
    let hirePacket: Record<string, unknown> | undefined;
    if (
      ctx.input.hirePacketWhoId !== undefined ||
      ctx.input.hirePacketAddress ||
      ctx.input.hirePacketWhenTime ||
      ctx.input.hirePacketInstructions
    ) {
      hirePacket = {
        who_id: ctx.input.hirePacketWhoId,
        address: ctx.input.hirePacketAddress,
        when_time: ctx.input.hirePacketWhenTime,
        instructions: ctx.input.hirePacketInstructions
      };
    }

    let compensationRecord: Record<string, unknown> | undefined;
    if (
      ctx.input.payRate !== undefined ||
      ctx.input.payRatePeriod ||
      ctx.input.payRateSchedule ||
      ctx.input.overtimeStatus
    ) {
      if (ctx.input.payRate === undefined)
        throw createApiServiceError(
          'payRate is required when providing compensation details.'
        );
      compensationRecord = {
        pay_rate: ctx.input.payRate,
        pay_rate_period: ctx.input.payRatePeriod,
        pay_rate_schedule: ctx.input.payRateSchedule,
        overtime_status: ctx.input.overtimeStatus
      };
    }

    let jobRecord: Record<string, number | null> | undefined;
    if (
      ctx.input.jobTitleId ||
      ctx.input.locationId ||
      ctx.input.divisionId ||
      ctx.input.departmentId
    ) {
      jobRecord = {
        job_title_id:
          ctx.input.jobTitleId === undefined
            ? null
            : providerId(ctx.input.jobTitleId, 'jobTitleId'),
        location_id:
          ctx.input.locationId === undefined
            ? null
            : providerId(ctx.input.locationId, 'locationId'),
        division_id:
          ctx.input.divisionId === undefined
            ? null
            : providerId(ctx.input.divisionId, 'divisionId'),
        department_id:
          ctx.input.departmentId === undefined
            ? null
            : providerId(ctx.input.departmentId, 'departmentId')
      };
    }

    let response = await client.hireEmployee({
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName,
      email: ctx.input.email,
      hire_date: ctx.input.hireDate,
      employment_status: {
        employment_status_id: providerId(ctx.input.employmentStatusId, 'employmentStatusId')
      },
      reports_to_employee_id:
        ctx.input.reportsToEmployeeId === undefined
          ? null
          : providerId(ctx.input.reportsToEmployeeId, 'reportsToEmployeeId'),
      job_record: jobRecord,
      compensation_record: compensationRecord,
      prevent_email: ctx.input.preventEmail,
      is_existing: ctx.input.isExisting,
      hire_packet: hirePacket
    });

    let employeeId = response.data.id;

    return {
      output: {
        employeeId,
        rawResponse: response
      },
      message: `Successfully hired **${ctx.input.firstName} ${ctx.input.lastName}** (${ctx.input.email}) with employee ID ${employeeId}.`
    };
  })
  .build();

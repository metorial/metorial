import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompanyInfo = SlateTool.create(spec, {
  name: 'Get Company Info',
  key: 'get_company_info',
  description: `Retrieve company-level settings and metadata from DeskTime. Returns the company name, configured work start/end times, work duration, working days, tracking schedule, and timezone.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      companyName: z.string().optional().describe('Name of the company'),
      workStart: z.string().optional().describe('Configured work start time'),
      workEnd: z.string().optional().describe('Configured work end time'),
      workDuration: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Configured work duration'),
      workingDays: z.any().optional().describe('Working days configuration'),
      trackingStart: z.string().optional().describe('Tracking start time'),
      trackingStop: z.string().optional().describe('Tracking stop time'),
      timezone: z.string().optional().describe('Company timezone'),
      rawResponse: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.getCompany();

    let company =
      isApiErrorRecord(response) && isApiErrorRecord(response.company)
        ? response.company
        : response;
    if (!isApiErrorRecord(company)) {
      throw createApiServiceError('DeskTime returned an invalid company response.', {
        reason: 'desktime_invalid_response'
      });
    }
    let workStart = company.work_starts ?? company.work_start;
    let workEnd = company.work_ends ?? company.work_end;
    let trackingStart = company.work_start_tracking ?? company.tracking_start;
    let trackingStop = company.work_stop_tracking ?? company.tracking_stop;
    let timezone = company.timezone_identifier ?? company.timezone;

    return {
      output: {
        companyName: typeof company.name === 'string' ? company.name : undefined,
        workStart: typeof workStart === 'string' ? workStart : undefined,
        workEnd: typeof workEnd === 'string' ? workEnd : undefined,
        workDuration:
          typeof company.work_duration === 'string' ||
          typeof company.work_duration === 'number'
            ? company.work_duration
            : undefined,
        workingDays: company?.working_days,
        trackingStart: typeof trackingStart === 'string' ? trackingStart : undefined,
        trackingStop: typeof trackingStop === 'string' ? trackingStop : undefined,
        timezone: typeof timezone === 'string' ? timezone : undefined,
        rawResponse: response
      },
      message: `Retrieved company information for **${company?.name || 'your company'}**.`
    };
  })
  .build();

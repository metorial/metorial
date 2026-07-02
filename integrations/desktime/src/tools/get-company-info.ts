import { SlateTool } from 'slates';
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

    let company = response?.company || response;

    return {
      output: {
        companyName: company?.name,
        workStart: company?.work_start,
        workEnd: company?.work_end,
        workDuration: company?.work_duration,
        workingDays: company?.working_days,
        trackingStart: company?.tracking_start,
        trackingStop: company?.tracking_stop,
        timezone: company?.timezone,
        rawResponse: response
      },
      message: `Retrieved company information for **${company?.name || 'your company'}**.`
    };
  })
  .build();

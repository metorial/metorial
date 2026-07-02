import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let getCheckin = SlateTool.create(spec, {
  name: 'Get Check-in',
  key: 'get_checkin',
  description: `Retrieve detailed information about a specific check-in, including its configuration, schedule, and optionally a summary for a given date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      checkinUuid: z.string().describe('UUID of the check-in to retrieve'),
      includeSummary: z
        .boolean()
        .optional()
        .describe('Whether to include check-in summary data'),
      date: z
        .string()
        .optional()
        .describe(
          'Date for the summary calculation (YYYY-MM-DD). Only used when includeSummary is true'
        )
    })
  )
  .output(
    z.object({
      checkinUuid: z.string().describe('UUID of the check-in'),
      name: z.string().describe('Name of the check-in'),
      isActive: z.boolean().describe('Whether the check-in is active'),
      isAnonymous: z.boolean().optional().describe('Whether responses are anonymous'),
      frequency: z.string().optional().describe('Scheduling frequency'),
      templateUuid: z.string().optional().describe('UUID of the template used'),
      summary: z.any().optional().describe('Summary data for the check-in'),
      raw: z.any().describe('Full check-in object from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let checkin = await client.getCheckin(ctx.input.checkinUuid, {
      includeSummary: ctx.input.includeSummary,
      date: ctx.input.date
    });

    return {
      output: {
        checkinUuid: checkin.uuid,
        name: checkin.name,
        isActive: checkin.is_active ?? checkin.active ?? true,
        isAnonymous: checkin.is_anonymous,
        frequency: checkin.frequency,
        templateUuid: checkin.template?.uuid ?? checkin.template_uuid,
        summary: checkin.summary,
        raw: checkin
      },
      message: `Retrieved check-in **${checkin.name}**.`
    };
  })
  .build();

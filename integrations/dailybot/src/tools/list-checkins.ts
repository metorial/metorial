import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let listCheckins = SlateTool.create(spec, {
  name: 'List Check-ins',
  key: 'list_checkins',
  description: `List all check-ins (async stand-ups and recurring surveys) visible to the authenticated user. Optionally include summary data for a specific date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeSummary: z
        .boolean()
        .optional()
        .describe('Whether to include check-in summary data in the response'),
      date: z
        .string()
        .optional()
        .describe(
          'Date for which to calculate the check-in summary (YYYY-MM-DD format). Only used when includeSummary is true'
        )
    })
  )
  .output(
    z.object({
      checkins: z
        .array(
          z.object({
            checkinUuid: z.string().describe('UUID of the check-in'),
            name: z.string().describe('Name of the check-in'),
            isActive: z.boolean().describe('Whether the check-in is currently active'),
            isAnonymous: z.boolean().optional().describe('Whether responses are anonymous'),
            frequency: z.string().optional().describe('Scheduling frequency of the check-in'),
            summary: z
              .any()
              .optional()
              .describe('Summary data for the check-in (when requested)')
          })
        )
        .describe('List of check-ins')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let checkins = await client.listCheckins({
      includeSummary: ctx.input.includeSummary,
      date: ctx.input.date
    });

    let mapped = checkins.map((c: any) => ({
      checkinUuid: c.uuid,
      name: c.name,
      isActive: c.is_active ?? c.active ?? true,
      isAnonymous: c.is_anonymous,
      frequency: c.frequency,
      summary: c.summary
    }));

    return {
      output: { checkins: mapped },
      message: `Found **${mapped.length}** check-in(s).`
    };
  })
  .build();

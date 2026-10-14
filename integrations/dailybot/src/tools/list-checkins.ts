import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let listCheckins = SlateTool.create(spec, {
  name: 'List Check-ins',
  key: 'list_checkins',
  description: `List a page of check-ins (async stand-ups and recurring surveys) visible to the authenticated user. Optionally filter by name, team, or user and include summary data for a specific date.`,
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
      page: z.number().optional().describe('Page number, starting at 1'),
      pageSize: z.number().optional().describe('Check-ins per page; default 50, maximum 200'),
      search: z.string().optional().describe('Search by check-in name'),
      teamUuid: z.string().optional().describe('Team UUID. Use list_teams to discover teams.'),
      userUuid: z.string().optional().describe('User UUID. Use list_users to discover users.'),
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
        .describe('List of check-ins'),
      count: z.number().optional().describe('Total number of matching check-ins'),
      next: z.string().nullable().optional().describe('URL of the next page, or null'),
      previous: z.string().nullable().optional().describe('URL of the previous page, or null')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let result = await client.listCheckins(ctx.input);
    let checkins = result?.results ?? result;

    let mapped = checkins.map((c: any) => ({
      checkinUuid: c.uuid,
      name: c.name,
      isActive: c.is_active ?? c.active ?? true,
      isAnonymous: c.is_anonymous,
      frequency: c.frequency,
      summary: c.summary
    }));

    return {
      output: {
        checkins: mapped,
        count: result?.count,
        next: result?.next,
        previous: result?.previous
      },
      message: `Found **${mapped.length}** check-in(s).`
    };
  })
  .build();

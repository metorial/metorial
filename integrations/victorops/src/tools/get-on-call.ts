import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOnCall = SlateTool.create(spec, {
  name: 'Get On-Call',
  key: 'get_on_call',
  description: `Get current on-call users and schedules. Can retrieve the organization-wide on-call roster, a specific user's on-call schedule, or a specific team's on-call schedule.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      scope: z.enum(['organization', 'user', 'team']).describe('Scope of the on-call query'),
      username: z
        .string()
        .optional()
        .describe('Username to get on-call schedule for (required when scope is "user")'),
      teamSlug: z
        .string()
        .optional()
        .describe('Team slug to get on-call schedule for (required when scope is "team")'),
      daysForward: z
        .number()
        .optional()
        .describe('Number of days forward to retrieve the team schedule for'),
      daysSkip: z
        .number()
        .optional()
        .describe('Number of days to skip before the schedule window')
    })
  )
  .output(
    z.object({
      teamsOnCall: z
        .array(z.any())
        .optional()
        .describe('Current on-call users grouped by team (for organization scope)'),
      schedule: z
        .any()
        .optional()
        .describe('On-call schedule details (for user or team scope)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiId: ctx.auth.apiId,
      token: ctx.auth.token
    });

    switch (ctx.input.scope) {
      case 'organization': {
        let data = await client.getCurrentOnCall();
        let teamsOnCall = data?.teamsOnCall ?? [];
        return {
          output: { teamsOnCall },
          message: `Retrieved on-call roster for **${teamsOnCall.length}** team(s).`
        };
      }

      case 'user': {
        let schedule = await client.getUserOnCallSchedule(ctx.input.username ?? '');
        return {
          output: { schedule },
          message: `Retrieved on-call schedule for user **${ctx.input.username}**.`
        };
      }

      case 'team': {
        let schedule = await client.getTeamOnCallSchedule(ctx.input.teamSlug ?? '', {
          daysForward: ctx.input.daysForward,
          daysSkip: ctx.input.daysSkip
        });
        return {
          output: { schedule },
          message: `Retrieved on-call schedule for team **${ctx.input.teamSlug}**.`
        };
      }
    }
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed information about a specific user, including their role, timezone, and optionally their teams, schedules, and escalation policies.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userIdentifier: z.string().describe('User ID or username (email)'),
      includeTeams: z
        .boolean()
        .optional()
        .describe('Also fetch the teams the user belongs to'),
      includeSchedules: z
        .boolean()
        .optional()
        .describe('Also fetch the schedules the user is part of')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      username: z.string().describe('User email'),
      fullName: z.string().describe('Full name'),
      role: z.string().optional().describe('User role'),
      blocked: z.boolean().optional().describe('Whether the user is blocked'),
      verified: z.boolean().optional().describe('Whether the user is verified'),
      createdAt: z.string().optional().describe('Account creation time'),
      timezone: z.string().optional().describe('User timezone'),
      locale: z.string().optional().describe('User locale'),
      tags: z.array(z.string()).optional().describe('User tags'),
      teams: z
        .array(
          z.object({
            teamId: z.string().describe('Team ID'),
            name: z.string().describe('Team name')
          })
        )
        .optional()
        .describe('Teams the user belongs to'),
      schedules: z
        .array(
          z.object({
            scheduleId: z.string().describe('Schedule ID'),
            name: z.string().describe('Schedule name')
          })
        )
        .optional()
        .describe('Schedules the user is part of')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let user = await client.getUser(ctx.input.userIdentifier);

    let teams: any[] | undefined;
    let schedules: any[] | undefined;

    if (ctx.input.includeTeams) {
      let teamsData = await client.listUserTeams(ctx.input.userIdentifier);
      teams = (teamsData ?? []).map((t: any) => ({
        teamId: t.id,
        name: t.name
      }));
    }

    if (ctx.input.includeSchedules) {
      let schedulesData = await client.listUserSchedules(ctx.input.userIdentifier);
      schedules = (schedulesData ?? []).map((s: any) => ({
        scheduleId: s.id,
        name: s.name
      }));
    }

    return {
      output: {
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role?.name ?? user.role,
        blocked: user.blocked,
        verified: user.verified,
        createdAt: user.createdAt,
        timezone: user.timeZone ?? user.timezone,
        locale: user.locale,
        tags: user.tags,
        teams,
        schedules
      },
      message: `User **${user.fullName}** (${user.username}) — role: ${user.role?.name ?? user.role}`
    };
  })
  .build();

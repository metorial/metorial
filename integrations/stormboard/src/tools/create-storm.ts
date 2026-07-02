import { SlateTool } from 'slates';
import { z } from 'zod';
import { StormboardClient } from '../lib/client';
import { spec } from '../spec';

export let createStorm = SlateTool.create(spec, {
  name: 'Create Storm',
  key: 'create_storm',
  description: `Create a new Storm (collaborative workspace/board). Configure the title, plan type, goals, votes per user, and avatar visibility settings. Team Storms require a team ID.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the Storm'),
      plan: z
        .enum(['personal', 'student', 'educator', 'team'])
        .describe('Plan type for the Storm'),
      goals: z.string().optional().describe('Goals and description for the Storm'),
      votesPerUser: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Number of votes per user (0-100, defaults to 10)'),
      showAvatars: z
        .boolean()
        .optional()
        .describe('Show real-time user avatars on the Storm wall'),
      showIdeaCreator: z
        .boolean()
        .optional()
        .describe('Show the idea creator avatar on ideas'),
      teamId: z.string().optional().describe('Team ID (required when plan is "team")')
    })
  )
  .output(
    z.object({
      stormId: z.number().describe('ID of the created Storm'),
      key: z.string().optional().describe('Storm key'),
      title: z.string().describe('Title of the created Storm'),
      goals: z.string().optional().describe('Goals of the created Storm'),
      lastActivity: z.string().optional().describe('Last activity timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StormboardClient({ token: ctx.auth.token });

    let result = await client.createStorm({
      title: ctx.input.title,
      plan: ctx.input.plan,
      goals: ctx.input.goals,
      votesperuser: ctx.input.votesPerUser,
      avatars: ctx.input.showAvatars,
      ideacreator: ctx.input.showIdeaCreator,
      team_id: ctx.input.teamId
    });

    return {
      output: {
        stormId: result.id,
        key: result.key,
        title: result.title,
        goals: result.goals,
        lastActivity: result.lastactivity
      },
      message: `Created Storm **"${result.title}"** (ID: ${result.id}).`
    };
  })
  .build();

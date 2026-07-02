import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTeam = SlateTool.create(spec, {
  name: 'Manage Team',
  key: 'manage_team',
  description: `Create a new team or update an existing team's settings including name, description, visibility, and membership/video policies. For creation, provide "name" and "slug". For updates, provide "teamSlug" and the fields to change.`,
  instructions: [
    'To create a new team, provide name, slug, and optionally type. Team creation is restricted to Amara partners.',
    'To update a team, provide teamSlug with the fields you want to change.'
  ]
})
  .input(
    z.object({
      teamSlug: z
        .string()
        .optional()
        .describe('Team slug to update (omit when creating a new team)'),
      name: z.string().optional().describe('Team name (required for creation)'),
      slug: z.string().optional().describe('Team slug (required for creation)'),
      type: z
        .enum(['default', 'simple', 'collaboration'])
        .optional()
        .describe('Team type (only for creation)'),
      description: z.string().optional().describe('Team description'),
      teamVisibility: z
        .enum(['private', 'unlisted', 'public'])
        .optional()
        .describe('Team visibility'),
      videoVisibility: z
        .enum(['private', 'unlisted', 'public'])
        .optional()
        .describe('Video visibility'),
      membershipPolicy: z
        .string()
        .optional()
        .describe('Membership policy (Open/Application/Invitation by...)'),
      videoPolicy: z.string().optional().describe('Video policy')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Team name'),
      teamSlug: z.string().describe('Team slug'),
      type: z.string().describe('Team type'),
      description: z.string().describe('Team description'),
      teamVisibility: z.string().describe('Team visibility'),
      videoVisibility: z.string().describe('Video visibility'),
      membershipPolicy: z.string().describe('Membership policy'),
      videoPolicy: z.string().describe('Video policy')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let isCreate = !ctx.input.teamSlug;

    let team: any;
    if (isCreate) {
      if (!ctx.input.name || !ctx.input.slug) {
        throw new Error('name and slug are required when creating a new team');
      }
      team = await client.createTeam({
        name: ctx.input.name,
        slug: ctx.input.slug,
        type: ctx.input.type,
        description: ctx.input.description,
        teamVisibility: ctx.input.teamVisibility,
        videoVisibility: ctx.input.videoVisibility,
        membershipPolicy: ctx.input.membershipPolicy,
        videoPolicy: ctx.input.videoPolicy
      });
    } else {
      team = await client.updateTeam(ctx.input.teamSlug!, {
        name: ctx.input.name,
        slug: ctx.input.slug,
        description: ctx.input.description,
        teamVisibility: ctx.input.teamVisibility,
        videoVisibility: ctx.input.videoVisibility,
        membershipPolicy: ctx.input.membershipPolicy,
        videoPolicy: ctx.input.videoPolicy
      });
    }

    return {
      output: {
        name: team.name,
        teamSlug: team.slug,
        type: team.type,
        description: team.description,
        teamVisibility: team.team_visibility,
        videoVisibility: team.video_visibility,
        membershipPolicy: team.membership_policy,
        videoPolicy: team.video_policy
      },
      message: isCreate
        ? `Created team **"${team.name}"** (\`${team.slug}\`).`
        : `Updated team **"${team.name}"** (\`${team.slug}\`).`
    };
  })
  .build();

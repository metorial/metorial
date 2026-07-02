import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateActivity = SlateTool.create(spec, {
  name: 'Update Activity',
  key: 'update_activity',
  description: `Update an existing activity's metadata such as name, description, sport type, gear assignment, and flags. Only the fields you provide will be updated. Requires \`activity:write\` scope.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      activityId: z.number().describe('The activity identifier to update'),
      name: z.string().optional().describe('New name for the activity'),
      sportType: z.string().optional().describe('New sport type'),
      description: z.string().optional().describe('New description'),
      trainer: z.boolean().optional().describe('Mark as trainer/indoor activity'),
      commute: z.boolean().optional().describe('Mark as commute'),
      hideFromHome: z.boolean().optional().describe('Hide from the home feed'),
      gearId: z
        .string()
        .optional()
        .describe('Gear identifier to assign (use "none" to remove gear)')
    })
  )
  .output(
    z.object({
      activityId: z.number().describe('Updated activity identifier'),
      name: z.string().describe('Activity name'),
      sportType: z.string().describe('Sport type'),
      description: z.string().nullable().optional().describe('Activity description'),
      gearId: z.string().nullable().optional().describe('Assigned gear identifier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let activity = await client.updateActivity(ctx.input.activityId, {
      name: ctx.input.name,
      sportType: ctx.input.sportType,
      description: ctx.input.description,
      trainer: ctx.input.trainer,
      commute: ctx.input.commute,
      hideFromHome: ctx.input.hideFromHome,
      gearId: ctx.input.gearId
    });

    return {
      output: {
        activityId: activity.id,
        name: activity.name,
        sportType: activity.sport_type || activity.type,
        description: activity.description,
        gearId: activity.gear_id
      },
      message: `Updated activity **${activity.name}** (ID: ${activity.id}).`
    };
  })
  .build();

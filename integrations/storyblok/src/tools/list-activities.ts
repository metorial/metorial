import { SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { spec } from '../spec';

export let listActivities = SlateTool.create(spec, {
  name: 'List Activities',
  key: 'list_activities',
  description: `Retrieve the audit log of recent activities in the space. Shows actions performed by users, such as content changes, publications, and configuration updates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Activities per page (default: 25)')
    })
  )
  .output(
    z.object({
      activities: z
        .array(
          z.object({
            activityId: z.number().optional().describe('Activity ID'),
            trackableId: z.number().optional().describe('ID of the resource affected'),
            trackableType: z
              .string()
              .optional()
              .describe('Type of the resource affected (e.g. "Story", "Component")'),
            action: z
              .string()
              .optional()
              .describe('Action key (e.g. "story.publish", "component.create")'),
            ownerId: z.number().optional().describe('User ID who performed the action'),
            createdAt: z.string().optional().describe('Activity timestamp')
          })
        )
        .describe('List of activities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StoryblokClient({
      token: ctx.auth.token,
      region: ctx.auth.region,
      spaceId: ctx.config.spaceId
    });

    let activities = await client.listActivities({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let mapped = activities.map(a => ({
      activityId: a.id,
      trackableId: a.trackable_id,
      trackableType: a.trackable_type,
      action: a.key,
      ownerId: a.owner_id,
      createdAt: a.created_at
    }));

    return {
      output: { activities: mapped },
      message: `Found **${mapped.length}** recent activities.`
    };
  })
  .build();

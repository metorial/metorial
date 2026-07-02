import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateIteration = SlateTool.create(spec, {
  name: 'Update Iteration',
  key: 'update_iteration',
  description: `Updates an existing iteration's attributes including name, dates, description, teams, followers, and labels.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      iterationId: z.number().describe('ID of the iteration to update'),
      name: z.string().optional().describe('New name'),
      startDate: z.string().optional().describe('New start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('New end date in YYYY-MM-DD format'),
      description: z.string().optional().describe('New description in Markdown'),
      followerIds: z
        .array(z.string())
        .optional()
        .describe('UUIDs of followers (replaces existing)'),
      groupIds: z.array(z.string()).optional().describe('UUIDs of teams/groups'),
      labels: z
        .array(
          z.object({
            name: z.string().describe('Label name')
          })
        )
        .optional()
        .describe('Labels to set (replaces existing)')
    })
  )
  .output(
    z.object({
      iterationId: z.number().describe('ID of the updated iteration'),
      name: z.string().describe('Updated name'),
      appUrl: z.string().describe('URL to view in Shortcut'),
      status: z.string().describe('Current status'),
      startDate: z.string().describe('Start date'),
      endDate: z.string().describe('End date'),
      updatedAt: z.string().describe('Update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {};

    if (ctx.input.name !== undefined) params.name = ctx.input.name;
    if (ctx.input.startDate !== undefined) params.start_date = ctx.input.startDate;
    if (ctx.input.endDate !== undefined) params.end_date = ctx.input.endDate;
    if (ctx.input.description !== undefined) params.description = ctx.input.description;
    if (ctx.input.followerIds !== undefined) params.follower_ids = ctx.input.followerIds;
    if (ctx.input.groupIds !== undefined) params.group_ids = ctx.input.groupIds;

    if (ctx.input.labels) {
      params.labels = ctx.input.labels.map(l => ({ name: l.name }));
    }

    let iteration = await client.updateIteration(ctx.input.iterationId, params);

    return {
      output: {
        iterationId: iteration.id,
        name: iteration.name,
        appUrl: iteration.app_url,
        status: iteration.status,
        startDate: iteration.start_date,
        endDate: iteration.end_date,
        updatedAt: iteration.updated_at
      },
      message: `Updated iteration **${iteration.name}** (ID: ${iteration.id}) — [View in Shortcut](${iteration.app_url})`
    };
  })
  .build();

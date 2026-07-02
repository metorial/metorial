import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createIteration = SlateTool.create(spec, {
  name: 'Create Iteration',
  key: 'create_iteration',
  description: `Creates a new iteration (sprint) in Shortcut. Iterations are time-boxed periods of development with a start and end date. Stories can be assigned to iterations for sprint planning.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the iteration (max 256 characters)'),
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
      description: z.string().optional().describe('Description in Markdown'),
      followerIds: z.array(z.string()).optional().describe('UUIDs of followers'),
      groupIds: z.array(z.string()).optional().describe('UUIDs of teams/groups'),
      labels: z
        .array(
          z.object({
            name: z.string().describe('Label name')
          })
        )
        .optional()
        .describe('Labels to apply')
    })
  )
  .output(
    z.object({
      iterationId: z.number().describe('ID of the created iteration'),
      name: z.string().describe('Name of the iteration'),
      appUrl: z.string().describe('URL to view the iteration in Shortcut'),
      status: z.string().describe('Current status of the iteration'),
      startDate: z.string().describe('Start date'),
      endDate: z.string().describe('End date'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {
      name: ctx.input.name,
      start_date: ctx.input.startDate,
      end_date: ctx.input.endDate
    };

    if (ctx.input.description !== undefined) params.description = ctx.input.description;
    if (ctx.input.followerIds !== undefined) params.follower_ids = ctx.input.followerIds;
    if (ctx.input.groupIds !== undefined) params.group_ids = ctx.input.groupIds;

    if (ctx.input.labels) {
      params.labels = ctx.input.labels.map(l => ({ name: l.name }));
    }

    let iteration = await client.createIteration(params);

    return {
      output: {
        iterationId: iteration.id,
        name: iteration.name,
        appUrl: iteration.app_url,
        status: iteration.status,
        startDate: iteration.start_date,
        endDate: iteration.end_date,
        createdAt: iteration.created_at
      },
      message: `Created iteration **${iteration.name}** (ID: ${iteration.id}) — [View in Shortcut](${iteration.app_url})`
    };
  })
  .build();

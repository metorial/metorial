import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type ListParams } from '../lib/client';
import { spec } from '../spec';

let tagSchema = z.object({
  tagId: z.string().describe('Unique tag identifier'),
  name: z.string().describe('Tag name'),
  teamId: z.string().nullable().optional().describe('Team ID (null for private tags)'),
  color: z.string().nullable().optional().describe('Tag color'),
  icon: z.string().nullable().optional().describe('Tag icon identifier'),
  isFavorite: z.boolean().optional().describe('Whether the tag is favorited'),
  archivedAt: z.number().nullable().optional().describe('Archive timestamp (null if active)')
});

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `Retrieve tags from Nozbe Teams. Tags categorize tasks by context, place, or tool needed for completion. Can also retrieve tags assigned to a specific task.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter tags by name'),
      taskId: z.string().optional().describe('Get tags assigned to a specific task'),
      sortBy: z.string().optional().describe('Sort fields, e.g. "name" or "-name"'),
      limit: z.number().optional().describe('Maximum number of tags to return'),
      offset: z.number().optional().describe('Number of tags to skip')
    })
  )
  .output(
    z.object({
      tags: z.array(tagSchema).describe('List of tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: ListParams = {};
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.taskId) params.task_id = ctx.input.taskId;
    if (ctx.input.sortBy) params.sortBy = ctx.input.sortBy;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let tags = await client.listTags(params);

    let mapped = tags.map((t: any) => ({
      tagId: t.id,
      name: t.name,
      teamId: t.team_id,
      color: t.color,
      icon: t.icon,
      isFavorite: t.is_favorite,
      archivedAt: t.archived_at
    }));

    return {
      output: { tags: mapped },
      message: `Found **${mapped.length}** tag(s).`
    };
  })
  .build();

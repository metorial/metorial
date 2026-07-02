import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let storyLabelSchema = z.object({
  labelId: z.number().describe('Label ID'),
  name: z.string().describe('Label name'),
  color: z.string().nullable().describe('Label color hex code')
});

let storyTaskSchema = z.object({
  taskId: z.number().describe('Task ID'),
  description: z.string().describe('Task description'),
  complete: z.boolean().describe('Whether the task is complete'),
  ownerIds: z.array(z.string()).describe('UUIDs of task owners')
});

let storyCommentSchema = z.object({
  commentId: z.number().describe('Comment ID'),
  text: z.string().describe('Comment text'),
  authorId: z.string().nullable().describe('UUID of comment author'),
  createdAt: z.string().describe('Comment creation timestamp')
});

export let getStory = SlateTool.create(spec, {
  name: 'Get Story',
  key: 'get_story',
  description: `Retrieves full details of a story by its public ID, including description, comments, tasks (checklists), labels, custom fields, relationships, and workflow state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      storyId: z.number().describe('Public ID of the story')
    })
  )
  .output(
    z.object({
      storyId: z.number().describe('Public ID of the story'),
      name: z.string().describe('Name of the story'),
      description: z.string().describe('Description of the story'),
      storyType: z.string().describe('Type: feature, bug, or chore'),
      appUrl: z.string().describe('URL to view the story in Shortcut'),
      archived: z.boolean().describe('Whether the story is archived'),
      started: z.boolean().describe('Whether the story is started'),
      completed: z.boolean().describe('Whether the story is completed'),
      blocked: z.boolean().describe('Whether the story is blocked'),
      blocker: z.boolean().describe('Whether the story is blocking other stories'),
      workflowStateId: z.number().describe('Current workflow state ID'),
      epicId: z.number().nullable().describe('Epic ID if assigned'),
      iterationId: z.number().nullable().describe('Iteration ID if assigned'),
      groupId: z.string().nullable().describe('Team/Group UUID if assigned'),
      estimate: z.number().nullable().describe('Story point estimate'),
      deadline: z.string().nullable().describe('Deadline timestamp'),
      ownerIds: z.array(z.string()).describe('UUIDs of story owners'),
      followerIds: z.array(z.string()).describe('UUIDs of story followers'),
      labels: z.array(storyLabelSchema).describe('Labels on this story'),
      tasks: z.array(storyTaskSchema).describe('Checklist tasks on this story'),
      comments: z.array(storyCommentSchema).describe('Comments on this story'),
      externalId: z.string().nullable().describe('External identifier'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      completedAt: z.string().nullable().describe('Completion timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let story = await client.getStory(ctx.input.storyId);

    return {
      output: {
        storyId: story.id,
        name: story.name,
        description: story.description || '',
        storyType: story.story_type,
        appUrl: story.app_url,
        archived: story.archived,
        started: story.started,
        completed: story.completed,
        blocked: story.blocked,
        blocker: story.blocker,
        workflowStateId: story.workflow_state_id,
        epicId: story.epic_id ?? null,
        iterationId: story.iteration_id ?? null,
        groupId: story.group_id ?? null,
        estimate: story.estimate ?? null,
        deadline: story.deadline ?? null,
        ownerIds: story.owner_ids || [],
        followerIds: story.follower_ids || [],
        labels: (story.labels || []).map((l: any) => ({
          labelId: l.id,
          name: l.name,
          color: l.color ?? null
        })),
        tasks: (story.tasks || []).map((t: any) => ({
          taskId: t.id,
          description: t.description,
          complete: t.complete,
          ownerIds: t.owner_ids || []
        })),
        comments: (story.comments || []).map((c: any) => ({
          commentId: c.id,
          text: c.text,
          authorId: c.author_id ?? null,
          createdAt: c.created_at
        })),
        externalId: story.external_id ?? null,
        createdAt: story.created_at,
        updatedAt: story.updated_at,
        completedAt: story.completed_at ?? null
      },
      message: `Retrieved story **${story.name}** (ID: ${story.id}, type: ${story.story_type}) — [View in Shortcut](${story.app_url})`
    };
  })
  .build();

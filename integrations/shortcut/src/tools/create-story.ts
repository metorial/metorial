import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createStory = SlateTool.create(spec, {
  name: 'Create Story',
  key: 'create_story',
  description: `Creates a new story in Shortcut. Stories are the fundamental unit of work and can be of type Feature, Bug, or Chore. You can assign the story to an epic, iteration, team, workflow state, and set owners, labels, estimates, deadlines, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the story (max 512 characters)'),
      description: z
        .string()
        .optional()
        .describe('Description of the story in Markdown (max 100,000 characters)'),
      storyType: z.enum(['feature', 'bug', 'chore']).optional().describe('Type of story'),
      workflowStateId: z
        .number()
        .optional()
        .describe('ID of the workflow state to place the story in'),
      epicId: z
        .number()
        .optional()
        .nullable()
        .describe('ID of the epic this story belongs to'),
      iterationId: z
        .number()
        .optional()
        .nullable()
        .describe('ID of the iteration this story belongs to'),
      groupId: z.string().optional().nullable().describe('UUID of the team/group to assign'),
      ownerIds: z.array(z.string()).optional().describe('UUIDs of the story owners'),
      followerIds: z.array(z.string()).optional().describe('UUIDs of story followers'),
      estimate: z.number().optional().nullable().describe('Story point estimate'),
      deadline: z.string().optional().nullable().describe('Deadline in ISO 8601 format'),
      labels: z
        .array(
          z.object({
            name: z.string().describe('Label name')
          })
        )
        .optional()
        .describe(
          'Labels to apply to the story. Use existing label names or new ones will be created.'
        ),
      customFields: z
        .array(
          z.object({
            fieldId: z.string().describe('Custom field ID'),
            value: z.string().describe('Custom field enum value ID')
          })
        )
        .optional()
        .describe('Custom field values to set'),
      externalId: z
        .string()
        .optional()
        .describe('External identifier for cross-system linking'),
      requestedById: z
        .string()
        .optional()
        .describe('UUID of the member who requested the story'),
      tasks: z
        .array(
          z.object({
            description: z.string().describe('Task description'),
            complete: z.boolean().optional().describe('Whether the task is complete'),
            ownerIds: z.array(z.string()).optional().describe('UUIDs of the task owners')
          })
        )
        .optional()
        .describe('Checklist tasks to add to the story')
    })
  )
  .output(
    z.object({
      storyId: z.number().describe('Public ID of the created story'),
      name: z.string().describe('Name of the story'),
      storyType: z.string().describe('Type of the story'),
      appUrl: z.string().describe('URL to view the story in Shortcut'),
      workflowStateId: z.number().describe('Current workflow state ID'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.description !== undefined) params.description = ctx.input.description;
    if (ctx.input.storyType !== undefined) params.story_type = ctx.input.storyType;
    if (ctx.input.workflowStateId !== undefined)
      params.workflow_state_id = ctx.input.workflowStateId;
    if (ctx.input.epicId !== undefined) params.epic_id = ctx.input.epicId;
    if (ctx.input.iterationId !== undefined) params.iteration_id = ctx.input.iterationId;
    if (ctx.input.groupId !== undefined) params.group_id = ctx.input.groupId;
    if (ctx.input.ownerIds !== undefined) params.owner_ids = ctx.input.ownerIds;
    if (ctx.input.followerIds !== undefined) params.follower_ids = ctx.input.followerIds;
    if (ctx.input.estimate !== undefined) params.estimate = ctx.input.estimate;
    if (ctx.input.deadline !== undefined) params.deadline = ctx.input.deadline;
    if (ctx.input.externalId !== undefined) params.external_id = ctx.input.externalId;
    if (ctx.input.requestedById !== undefined)
      params.requested_by_id = ctx.input.requestedById;

    if (ctx.input.labels) {
      params.labels = ctx.input.labels.map(l => ({ name: l.name }));
    }

    if (ctx.input.customFields) {
      params.custom_fields = ctx.input.customFields.map(cf => ({
        field_id: cf.fieldId,
        value_id: cf.value
      }));
    }

    if (ctx.input.tasks) {
      params.tasks = ctx.input.tasks.map(t => ({
        description: t.description,
        complete: t.complete,
        owner_ids: t.ownerIds
      }));
    }

    let story = await client.createStory(params);

    return {
      output: {
        storyId: story.id,
        name: story.name,
        storyType: story.story_type,
        appUrl: story.app_url,
        workflowStateId: story.workflow_state_id,
        createdAt: story.created_at
      },
      message: `Created story **${story.name}** (ID: ${story.id}) — [View in Shortcut](${story.app_url})`
    };
  })
  .build();

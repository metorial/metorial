import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateStory = SlateTool.create(spec, {
  name: 'Update Story',
  key: 'update_story',
  description: `Updates an existing story's attributes. You can change the name, description, type, workflow state, epic, iteration, team, owners, labels, estimate, deadline, custom fields, and archived status. Pass \`null\` to unset optional fields like estimate, deadline, epicId, or iterationId.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      storyId: z.number().describe('Public ID of the story to update'),
      name: z.string().optional().describe('New name for the story'),
      description: z.string().optional().describe('New description in Markdown'),
      storyType: z.enum(['feature', 'bug', 'chore']).optional().describe('New story type'),
      workflowStateId: z.number().optional().describe('New workflow state ID'),
      epicId: z.number().optional().nullable().describe('Epic ID (null to unset)'),
      iterationId: z.number().optional().nullable().describe('Iteration ID (null to unset)'),
      groupId: z.string().optional().nullable().describe('Team/Group UUID (null to unset)'),
      ownerIds: z
        .array(z.string())
        .optional()
        .describe('UUIDs of new owners (replaces existing)'),
      followerIds: z
        .array(z.string())
        .optional()
        .describe('UUIDs of new followers (replaces existing)'),
      estimate: z
        .number()
        .optional()
        .nullable()
        .describe('Story point estimate (null to unset)'),
      deadline: z
        .string()
        .optional()
        .nullable()
        .describe('Deadline in ISO 8601 format (null to unset)'),
      labels: z
        .array(
          z.object({
            name: z.string().describe('Label name')
          })
        )
        .optional()
        .describe('Labels to set on the story (replaces existing)'),
      customFields: z
        .array(
          z.object({
            fieldId: z.string().describe('Custom field ID'),
            value: z.string().describe('Custom field enum value ID')
          })
        )
        .optional()
        .describe('Custom field values to set'),
      archived: z.boolean().optional().describe('Whether the story should be archived')
    })
  )
  .output(
    z.object({
      storyId: z.number().describe('Public ID of the updated story'),
      name: z.string().describe('Updated name'),
      storyType: z.string().describe('Updated type'),
      appUrl: z.string().describe('URL to view in Shortcut'),
      workflowStateId: z.number().describe('Updated workflow state ID'),
      updatedAt: z.string().describe('Update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {};

    if (ctx.input.name !== undefined) params.name = ctx.input.name;
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
    if (ctx.input.archived !== undefined) params.archived = ctx.input.archived;

    if (ctx.input.labels) {
      params.labels = ctx.input.labels.map(l => ({ name: l.name }));
    }

    if (ctx.input.customFields) {
      params.custom_fields = ctx.input.customFields.map(cf => ({
        field_id: cf.fieldId,
        value_id: cf.value
      }));
    }

    let story = await client.updateStory(ctx.input.storyId, params);

    return {
      output: {
        storyId: story.id,
        name: story.name,
        storyType: story.story_type,
        appUrl: story.app_url,
        workflowStateId: story.workflow_state_id,
        updatedAt: story.updated_at
      },
      message: `Updated story **${story.name}** (ID: ${story.id}) — [View in Shortcut](${story.app_url})`
    };
  })
  .build();

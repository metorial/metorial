import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { spec } from '../spec';

export let getSpaces = SlateTool.create(spec, {
  name: 'Get Spaces',
  key: 'get_spaces',
  description: `Retrieve all spaces in the configured ClickUp workspace, including their names, IDs, and statuses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      archived: z.boolean().optional().describe('Include archived spaces')
    })
  )
  .output(
    z.object({
      spaces: z.array(
        z.object({
          spaceId: z.string(),
          spaceName: z.string(),
          isPrivate: z.boolean().optional(),
          statuses: z
            .array(
              z.object({
                statusName: z.string(),
                statusColor: z.string().optional(),
                statusType: z.string().optional()
              })
            )
            .optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let spaces = await client.getSpaces(ctx.config.workspaceId, ctx.input.archived);

    return {
      output: {
        spaces: spaces.map((s: any) => ({
          spaceId: s.id,
          spaceName: s.name,
          isPrivate: s.private,
          statuses:
            s.statuses?.map((st: any) => ({
              statusName: st.status,
              statusColor: st.color,
              statusType: st.type
            })) ?? []
        }))
      },
      message: `Found **${spaces.length}** space(s) in workspace.`
    };
  })
  .build();

export let createSpace = SlateTool.create(spec, {
  name: 'Create Space',
  key: 'create_space',
  description: `Create a new space in the configured ClickUp workspace.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new space'),
      multipleAssignees: z.boolean().optional().describe('Allow multiple assignees on tasks')
    })
  )
  .output(
    z.object({
      spaceId: z.string(),
      spaceName: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let space = await client.createSpace(ctx.config.workspaceId, {
      name: ctx.input.name,
      multipleAssignees: ctx.input.multipleAssignees
    });

    return {
      output: {
        spaceId: space.id,
        spaceName: space.name
      },
      message: `Created space **${space.name}** (${space.id}).`
    };
  })
  .build();

export let updateSpace = SlateTool.create(spec, {
  name: 'Update Space',
  key: 'update_space',
  description: `Update an existing ClickUp space's name, color, privacy, or assignee settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      spaceId: z.string().describe('The space ID to update'),
      name: z.string().optional().describe('New name for the space'),
      color: z.string().optional().describe('Space color hex code'),
      isPrivate: z.boolean().optional().describe('Set space as private or public'),
      multipleAssignees: z.boolean().optional().describe('Allow multiple assignees on tasks')
    })
  )
  .output(
    z.object({
      spaceId: z.string(),
      spaceName: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let space = await client.updateSpace(ctx.input.spaceId, {
      name: ctx.input.name,
      color: ctx.input.color,
      private: ctx.input.isPrivate,
      multipleAssignees: ctx.input.multipleAssignees
    });

    return {
      output: {
        spaceId: space.id,
        spaceName: space.name
      },
      message: `Updated space **${space.name}** (${space.id}).`
    };
  })
  .build();

export let deleteSpace = SlateTool.create(spec, {
  name: 'Delete Space',
  key: 'delete_space',
  description: `Permanently delete a ClickUp space and all its contents. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      spaceId: z.string().describe('The space ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    await client.deleteSpace(ctx.input.spaceId);

    return {
      output: { deleted: true },
      message: `Deleted space ${ctx.input.spaceId}.`
    };
  })
  .build();

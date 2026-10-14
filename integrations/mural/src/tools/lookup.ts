import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { roomOutputSchema } from './manage-rooms';

export let getRoomTool = SlateTool.create(spec, {
  name: 'Get Room',
  key: 'get_room',
  description:
    'Retrieve a room by its ID. Call list_workspaces and list_rooms to discover room IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ roomId: z.string().describe('Room ID returned by list_rooms') }))
  .output(roomOutputSchema)
  .handleInvocation(async ctx => {
    let room = await new Client(ctx.auth).getRoom(ctx.input.roomId);
    return {
      output: {
        roomId: room.id,
        name: room.name,
        description: room.description,
        workspaceId: room.workspaceId,
        createdOn: room.createdOn,
        updatedOn: room.updatedOn,
        type: room.type,
        status: room.status
      },
      message: `Retrieved room **${room.name}**.`
    };
  })
  .build();

export let getWorkspaceTool = SlateTool.create(spec, {
  name: 'Get Workspace',
  key: 'get_workspace',
  description:
    'Retrieve details for a workspace. Call list_workspaces to discover workspace IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({ workspaceId: z.string().describe('Workspace ID returned by list_workspaces') })
  )
  .output(
    z.object({
      workspaceId: z.string(),
      name: z.string(),
      description: z.string().optional(),
      createdOn: z.string().optional(),
      locked: z.boolean().optional(),
      suspended: z.boolean().optional(),
      companyId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let workspace = await new Client(ctx.auth).getWorkspace(ctx.input.workspaceId);
    return {
      output: {
        workspaceId: workspace.id,
        name: workspace.name,
        description: workspace.description,
        createdOn: workspace.createdOn,
        locked: workspace.locked,
        suspended: workspace.suspended,
        companyId: workspace.companyId
      },
      message: `Retrieved workspace **${workspace.name}**.`
    };
  })
  .build();

export let deleteWidgetTool = SlateTool.create(spec, {
  name: 'Delete Widget',
  key: 'delete_widget',
  description:
    'Delete a widget and its content from a mural. Call list_widgets to discover widget IDs.',
  tags: { destructive: true }
})
  .input(
    z.object({
      muralId: z.string().describe('Mural containing the widget'),
      widgetId: z.string().describe('Widget ID returned by list_widgets')
    })
  )
  .output(z.object({ deleted: z.boolean(), muralId: z.string(), widgetId: z.string() }))
  .handleInvocation(async ctx => {
    await new Client(ctx.auth).deleteWidget(ctx.input.muralId, ctx.input.widgetId);
    return {
      output: { deleted: true, muralId: ctx.input.muralId, widgetId: ctx.input.widgetId },
      message: `Deleted widget **${ctx.input.widgetId}**.`
    };
  })
  .build();

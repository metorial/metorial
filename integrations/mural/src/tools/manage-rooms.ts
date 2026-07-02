import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let roomOutputSchema = z.object({
  roomId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  workspaceId: z.string().optional(),
  createdOn: z.string().optional(),
  updatedOn: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional()
});

export let listRoomsTool = SlateTool.create(spec, {
  name: 'List Rooms',
  key: 'list_rooms',
  description: `List rooms within a workspace. Returns room names, IDs, and metadata. Use **workspaceId** to scope the listing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to list rooms from'),
      limit: z.number().optional().describe('Maximum number of rooms to return'),
      nextToken: z.string().optional().describe('Pagination token from a previous request')
    })
  )
  .output(
    z.object({
      rooms: z.array(roomOutputSchema),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listRooms(ctx.input.workspaceId, {
      limit: ctx.input.limit,
      next: ctx.input.nextToken
    });

    let rooms = result.value.map(r => ({
      roomId: r.id,
      name: r.name,
      description: r.description,
      workspaceId: r.workspaceId,
      createdOn: r.createdOn,
      updatedOn: r.updatedOn,
      type: r.type,
      status: r.status
    }));

    return {
      output: { rooms, nextToken: result.next },
      message: `Found **${rooms.length}** room(s) in workspace.`
    };
  })
  .build();

export let createRoomTool = SlateTool.create(spec, {
  name: 'Create Room',
  key: 'create_room',
  description: `Create a new room within a workspace. Rooms organize murals and can have folders for further organization.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to create the room in'),
      name: z.string().describe('Name for the new room'),
      description: z.string().optional().describe('Description of the room'),
      type: z.string().optional().describe('Room type (e.g., "open" or "private")')
    })
  )
  .output(roomOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let room = await client.createRoom({
      workspaceId: ctx.input.workspaceId,
      name: ctx.input.name,
      description: ctx.input.description,
      type: ctx.input.type
    });

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
      message: `Created room **${room.name}** (${room.id}).`
    };
  })
  .build();

export let updateRoomTool = SlateTool.create(spec, {
  name: 'Update Room',
  key: 'update_room',
  description: `Update a room's name or description.`
})
  .input(
    z.object({
      roomId: z.string().describe('ID of the room to update'),
      name: z.string().optional().describe('New name for the room'),
      description: z.string().optional().describe('New description for the room')
    })
  )
  .output(roomOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let room = await client.updateRoom(ctx.input.roomId, {
      name: ctx.input.name,
      description: ctx.input.description
    });

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
      message: `Updated room **${room.name}**.`
    };
  })
  .build();

export let deleteRoomTool = SlateTool.create(spec, {
  name: 'Delete Room',
  key: 'delete_room',
  description: `Permanently delete a room and all its contents. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      roomId: z.string().describe('ID of the room to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteRoom(ctx.input.roomId);

    return {
      output: { deleted: true },
      message: `Deleted room **${ctx.input.roomId}**.`
    };
  })
  .build();

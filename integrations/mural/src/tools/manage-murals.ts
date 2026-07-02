import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let muralOutputSchema = z.object({
  muralId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  workspaceId: z.string().optional(),
  roomId: z.string().optional(),
  createdOn: z.string().optional(),
  updatedOn: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  status: z.string().optional()
});

export let listMuralsTool = SlateTool.create(spec, {
  name: 'List Murals',
  key: 'list_murals',
  description: `List murals within a workspace or a specific room. Provide either **workspaceId** or **roomId** to scope the listing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().optional().describe('ID of the workspace to list murals from'),
      roomId: z.string().optional().describe('ID of the room to list murals from'),
      limit: z.number().optional().describe('Maximum number of murals to return'),
      nextToken: z.string().optional().describe('Pagination token from a previous request')
    })
  )
  .output(
    z.object({
      murals: z.array(muralOutputSchema),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.roomId) {
      result = await client.listMuralsInRoom(ctx.input.roomId, {
        limit: ctx.input.limit,
        next: ctx.input.nextToken
      });
    } else if (ctx.input.workspaceId) {
      result = await client.listMuralsInWorkspace(ctx.input.workspaceId, {
        limit: ctx.input.limit,
        next: ctx.input.nextToken
      });
    } else {
      throw new Error('Either workspaceId or roomId must be provided');
    }

    let murals = result.value.map((m: any) => ({
      muralId: m.id,
      title: m.title,
      description: m.description,
      workspaceId: m.workspaceId,
      roomId: m.roomId,
      createdOn: m.createdOn,
      updatedOn: m.updatedOn,
      thumbnailUrl: m.thumbnailUrl,
      status: m.status
    }));

    return {
      output: { murals, nextToken: result.next },
      message: `Found **${murals.length}** mural(s).`
    };
  })
  .build();

export let getMuralTool = SlateTool.create(spec, {
  name: 'Get Mural',
  key: 'get_mural',
  description: `Retrieve detailed information about a specific mural by its ID, including title, description, workspace, room, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural to retrieve')
    })
  )
  .output(muralOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let m = await client.getMural(ctx.input.muralId);

    return {
      output: {
        muralId: m.id,
        title: m.title,
        description: m.description,
        workspaceId: m.workspaceId,
        roomId: m.roomId,
        createdOn: m.createdOn,
        updatedOn: m.updatedOn,
        thumbnailUrl: m.thumbnailUrl,
        status: m.status
      },
      message: `Retrieved mural **${m.title || m.id}**.`
    };
  })
  .build();

export let createMuralTool = SlateTool.create(spec, {
  name: 'Create Mural',
  key: 'create_mural',
  description: `Create a new blank mural in a workspace. Optionally place it in a specific room. To create a mural from a template, use the **Create Mural From Template** tool instead.`
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to create the mural in'),
      roomId: z.string().optional().describe('ID of the room to place the mural in'),
      title: z.string().optional().describe('Title for the new mural')
    })
  )
  .output(muralOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let m = await client.createMural({
      workspaceId: ctx.input.workspaceId,
      roomId: ctx.input.roomId,
      title: ctx.input.title
    });

    return {
      output: {
        muralId: m.id,
        title: m.title,
        description: m.description,
        workspaceId: m.workspaceId,
        roomId: m.roomId,
        createdOn: m.createdOn,
        updatedOn: m.updatedOn,
        thumbnailUrl: m.thumbnailUrl,
        status: m.status
      },
      message: `Created mural **${m.title || m.id}**.`
    };
  })
  .build();

export let updateMuralTool = SlateTool.create(spec, {
  name: 'Update Mural',
  key: 'update_mural',
  description: `Update a mural's title or description.`
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural to update'),
      title: z.string().optional().describe('New title for the mural'),
      description: z.string().optional().describe('New description for the mural')
    })
  )
  .output(muralOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let m = await client.updateMural(ctx.input.muralId, {
      title: ctx.input.title,
      description: ctx.input.description
    });

    return {
      output: {
        muralId: m.id,
        title: m.title,
        description: m.description,
        workspaceId: m.workspaceId,
        roomId: m.roomId,
        createdOn: m.createdOn,
        updatedOn: m.updatedOn,
        thumbnailUrl: m.thumbnailUrl,
        status: m.status
      },
      message: `Updated mural **${m.title || m.id}**.`
    };
  })
  .build();

export let deleteMuralTool = SlateTool.create(spec, {
  name: 'Delete Mural',
  key: 'delete_mural',
  description: `Permanently delete a mural. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteMural(ctx.input.muralId);

    return {
      output: { deleted: true },
      message: `Deleted mural **${ctx.input.muralId}**.`
    };
  })
  .build();

export let duplicateMuralTool = SlateTool.create(spec, {
  name: 'Duplicate Mural',
  key: 'duplicate_mural',
  description: `Create a copy of an existing mural, including all its content and widgets.`
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural to duplicate')
    })
  )
  .output(muralOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let m = await client.duplicateMural(ctx.input.muralId);

    return {
      output: {
        muralId: m.id,
        title: m.title,
        description: m.description,
        workspaceId: m.workspaceId,
        roomId: m.roomId,
        createdOn: m.createdOn,
        updatedOn: m.updatedOn,
        thumbnailUrl: m.thumbnailUrl,
        status: m.status
      },
      message: `Duplicated mural as **${m.title || m.id}**.`
    };
  })
  .build();

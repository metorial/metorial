import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { clickupServiceError } from '../lib/errors';
import { spec } from '../spec';

export let getLists = SlateTool.create(spec, {
  name: 'Get Lists',
  key: 'get_lists',
  description: `Retrieve ClickUp lists from a folder or space. When a **folderId** is provided, returns lists in that folder. When a **spaceId** is provided, returns folderless lists in the space.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Folder ID to get lists from'),
      spaceId: z.string().optional().describe('Space ID to get folderless lists from'),
      archived: z.boolean().optional().describe('Include archived lists')
    })
  )
  .output(
    z.object({
      lists: z.array(
        z.object({
          listId: z.string(),
          listName: z.string(),
          taskCount: z.number().optional(),
          status: z.any().optional(),
          folderId: z.string().optional(),
          spaceId: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let lists: any[];

    if (ctx.input.folderId) {
      lists = await client.getLists(ctx.input.folderId, ctx.input.archived);
    } else if (ctx.input.spaceId) {
      lists = await client.getFolderlessLists(ctx.input.spaceId, ctx.input.archived);
    } else {
      throw clickupServiceError('Either folderId or spaceId must be provided.');
    }

    return {
      output: {
        lists: lists.map((l: any) => ({
          listId: l.id,
          listName: l.name,
          taskCount: l.task_count,
          status: l.status,
          folderId: l.folder?.id,
          spaceId: l.space?.id
        }))
      },
      message: `Found **${lists.length}** list(s).`
    };
  })
  .build();

export let createList = SlateTool.create(spec, {
  name: 'Create List',
  key: 'create_list',
  description: `Create a new ClickUp list inside a folder or directly in a space (folderless). Provide either a **folderId** or a **spaceId**.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Folder ID to create the list in'),
      spaceId: z.string().optional().describe('Space ID to create a folderless list in'),
      name: z.string().describe('Name for the new list'),
      content: z.string().optional().describe('Description/content for the list'),
      priority: z.number().optional().describe('Default priority for the list'),
      status: z.string().optional().describe('Default status for tasks in the list')
    })
  )
  .output(
    z.object({
      listId: z.string(),
      listName: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let list: any;

    let data = {
      name: ctx.input.name,
      content: ctx.input.content,
      priority: ctx.input.priority,
      status: ctx.input.status
    };

    if (ctx.input.folderId) {
      list = await client.createList(ctx.input.folderId, data);
    } else if (ctx.input.spaceId) {
      list = await client.createFolderlessList(ctx.input.spaceId, data);
    } else {
      throw clickupServiceError('Either folderId or spaceId must be provided.');
    }

    return {
      output: {
        listId: list.id,
        listName: list.name
      },
      message: `Created list **${list.name}** (${list.id}).`
    };
  })
  .build();

export let updateList = SlateTool.create(spec, {
  name: 'Update List',
  key: 'update_list',
  description: `Update an existing ClickUp list's name, content, due date, or priority.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('The list ID to update'),
      name: z.string().optional().describe('New name for the list'),
      content: z.string().optional().describe('New content/description'),
      dueDate: z.string().optional().describe('Due date as Unix timestamp in milliseconds'),
      priority: z.number().optional().describe('Priority level')
    })
  )
  .output(
    z.object({
      listId: z.string(),
      listName: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let list = await client.updateList(ctx.input.listId, {
      name: ctx.input.name,
      content: ctx.input.content,
      dueDate: ctx.input.dueDate ? Number(ctx.input.dueDate) : undefined,
      priority: ctx.input.priority
    });

    return {
      output: {
        listId: list.id,
        listName: list.name
      },
      message: `Updated list **${list.name}** (${list.id}).`
    };
  })
  .build();

export let deleteList = SlateTool.create(spec, {
  name: 'Delete List',
  key: 'delete_list',
  description: `Permanently delete a ClickUp list and all its tasks. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('The list ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    await client.deleteList(ctx.input.listId);

    return {
      output: { deleted: true },
      message: `Deleted list ${ctx.input.listId}.`
    };
  })
  .build();

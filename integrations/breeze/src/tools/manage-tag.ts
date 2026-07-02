import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageTag = SlateTool.create(spec, {
  name: 'Manage Tag',
  key: 'manage_tag',
  description: `Create or delete tags and tag folders. Tags are used to organize and categorize people. Folders provide hierarchical grouping for tags.`
})
  .input(
    z.object({
      action: z
        .enum(['create_tag', 'delete_tag', 'create_folder', 'delete_folder'])
        .describe('The action to perform'),
      name: z
        .string()
        .optional()
        .describe('Name of the tag or folder (required for create actions)'),
      tagId: z.string().optional().describe('Tag ID (required for delete_tag)'),
      folderId: z
        .string()
        .optional()
        .describe('Folder ID for placing a new tag, or the folder to delete'),
      parentFolderId: z
        .string()
        .optional()
        .describe('Parent folder ID when creating a nested folder')
    })
  )
  .output(
    z.object({
      result: z.any().describe('The created tag/folder object, or confirmation of deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result: unknown;
    let message: string;

    switch (ctx.input.action) {
      case 'create_tag':
        if (!ctx.input.name) throw new Error('name is required to create a tag');
        result = await client.addTag(ctx.input.name, ctx.input.folderId);
        message = `Created tag **${ctx.input.name}**.`;
        break;
      case 'delete_tag':
        if (!ctx.input.tagId) throw new Error('tagId is required to delete a tag');
        result = await client.deleteTag(ctx.input.tagId);
        message = `Deleted tag (ID: ${ctx.input.tagId}).`;
        break;
      case 'create_folder':
        if (!ctx.input.name) throw new Error('name is required to create a folder');
        result = await client.addTagFolder(ctx.input.name, ctx.input.parentFolderId);
        message = `Created tag folder **${ctx.input.name}**.`;
        break;
      case 'delete_folder':
        if (!ctx.input.folderId) throw new Error('folderId is required to delete a folder');
        result = await client.deleteTagFolder(ctx.input.folderId);
        message = `Deleted tag folder (ID: ${ctx.input.folderId}).`;
        break;
    }

    return {
      output: { result },
      message: message!
    };
  })
  .build();

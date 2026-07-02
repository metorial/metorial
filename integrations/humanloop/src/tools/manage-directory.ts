import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDirectory = SlateTool.create(spec, {
  name: 'Manage Directory',
  key: 'manage_directory',
  description: `Create, update, retrieve, list, or delete directories. Directories organize Prompts, Evaluators, Datasets, Flows, and Tools into a hierarchical file structure. Retrieve a directory to see its contents including subdirectories and files.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'list', 'delete'])
        .describe('Action to perform'),
      directoryId: z
        .string()
        .optional()
        .describe('Directory ID (required for get, update, delete)'),
      path: z.string().optional().describe('Path for the directory (used for create)'),
      parentId: z.string().optional().describe('Parent directory ID (for create or move)'),
      name: z.string().optional().describe('New name for the directory (for update)')
    })
  )
  .output(
    z.object({
      directory: z
        .any()
        .optional()
        .describe('Directory details with subdirectories and files'),
      directories: z.array(z.any()).optional().describe('List of all directories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let directories = await client.listDirectories();
      let dirArray = Array.isArray(directories) ? directories : directories.records || [];
      return {
        output: { directories: dirArray },
        message: `Found **${dirArray.length}** directories.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.directoryId) throw new Error('directoryId is required for get action');
      let directory = await client.getDirectory(ctx.input.directoryId);
      return {
        output: { directory },
        message: `Retrieved directory **${directory.name || directory.path || ctx.input.directoryId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.path) throw new Error('path is required for create action');
      let body: { path: string; parent_id?: string } = { path: ctx.input.path };
      if (ctx.input.parentId) body.parent_id = ctx.input.parentId;
      let directory = await client.createDirectory(body);
      return {
        output: { directory },
        message: `Created directory **${directory.name || directory.path}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.directoryId) throw new Error('directoryId is required for update action');
      let body: Record<string, any> = {};
      if (ctx.input.name) body.name = ctx.input.name;
      if (ctx.input.parentId) body.parent_id = ctx.input.parentId;
      let directory = await client.updateDirectory(ctx.input.directoryId, body);
      return {
        output: { directory },
        message: `Updated directory **${directory.name || directory.path || ctx.input.directoryId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.directoryId) throw new Error('directoryId is required for delete action');
      await client.deleteDirectory(ctx.input.directoryId);
      return {
        output: {},
        message: `Deleted directory **${ctx.input.directoryId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();

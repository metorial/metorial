import { SlateTool } from 'slates';
import { z } from 'zod';
import { FilesComClient } from '../lib/client';
import { spec } from '../spec';

export let createFolder = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description: `Create a new folder at the specified path. Automatically creates parent directories if they don't exist.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      path: z
        .string()
        .describe('Full path for the new folder (e.g. "documents/reports/2024")'),
      mkdirParents: z
        .boolean()
        .optional()
        .default(true)
        .describe('Create parent directories automatically (default true)')
    })
  )
  .output(
    z.object({
      path: z.string().describe('Full path of the created folder'),
      displayName: z.string().describe('Display name of the folder'),
      type: z.string().describe('Always "directory"')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FilesComClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let result = await client.createFolder(ctx.input.path, {
      mkdirParents: ctx.input.mkdirParents
    });

    return {
      output: {
        path: String(result.path ?? ctx.input.path),
        displayName: String(result.display_name ?? ctx.input.path.split('/').pop() ?? ''),
        type: 'directory'
      },
      message: `Created folder \`${result.path ?? ctx.input.path}\``
    };
  })
  .build();
